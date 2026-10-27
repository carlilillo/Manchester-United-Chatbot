"""Convert a public page's main content to Markdown, excluding repeated layout."""

from __future__ import annotations

import argparse
import re
from pathlib import Path
from urllib.parse import urljoin

from bs4 import NavigableString, Tag

from common import Fetcher, clean, soup_for


REPEATED = re.compile(r"(?:sponsors|socialLinks|appPromo|footer|navigation|cookieBanner)", re.I)


def inline(node, base_url: str) -> str:
    if isinstance(node, NavigableString):
        return str(node)
    if not isinstance(node, Tag):
        return ""
    content = "".join(inline(child, base_url) for child in node.children)
    if node.name == "a" and node.get("href"):
        return f"[{clean(content) or 'Link'}]({urljoin(base_url, node['href'])})"
    if node.name == "img" and node.get("src"):
        return f"![{node.get('alt', '')}]({urljoin(base_url, node['src'])})"
    if node.name in ("strong", "b"):
        return f"**{content.strip()}**"
    if node.name in ("em", "i"):
        return f"*{content.strip()}*"
    if node.name == "code":
        return f"`{content.strip()}`"
    if node.name == "br":
        return "\n"
    return content


def table_markdown(table: Tag, base_url: str) -> list[str]:
    rows = []
    for tr in table.find_all("tr"):
        cells = [clean(inline(cell, base_url)).replace("|", "\\|")
                 for cell in tr.find_all(["th", "td"], recursive=False)]
        if cells:
            rows.append(cells)
    if not rows:
        return []
    width = max(map(len, rows))
    rows = [row + [""] * (width - len(row)) for row in rows]
    output = ["| " + " | ".join(rows[0]) + " |", "| " + " | ".join(["---"] * width) + " |"]
    output.extend("| " + " | ".join(row) + " |" for row in rows[1:])
    return output


def to_markdown(html: bytes, base_url: str) -> str:
    soup = soup_for(html)
    main = soup.main or soup.body or soup
    for node in list(main.find_all(["nav", "footer", "header", "aside", "script", "style", "noscript"])):
        node.decompose()
    for node in list(main.find_all(class_=lambda classes: classes and REPEATED.search(" ".join(classes) if isinstance(classes, list) else classes))):
        node.decompose()
    heading = main.find("h1")
    title = clean(heading.get_text(" ", strip=True)) if heading else clean(soup.title.get_text(" ", strip=True)) if soup.title else "Page"
    output = [f"# {title}", "", f"Source: [{base_url}]({base_url})", ""]
    # Walk only leaf content blocks, so nested layout containers cannot duplicate text.
    for node in main.descendants:
        if not isinstance(node, Tag):
            continue
        if node.name in ("h1", "h2", "h3", "h4", "h5", "h6"):
            if node is heading:
                continue
            output += ["#" * int(node.name[1]) + " " + clean(inline(node, base_url)), ""]
        elif node.name == "p":
            if node.find_parent(["li", "table", "blockquote"]):
                continue
            value = clean(inline(node, base_url))
            if value:
                output += [value, ""]
        elif node.name == "li":
            if node.find_parent("li"):
                continue
            value = clean(inline(node, base_url))
            if value:
                output.append(f"- {value}")
        elif node.name == "table":
            output.extend(["", *table_markdown(node, base_url), ""])
        elif node.name == "figure":
            image = node.find("img")
            if image:
                output += [inline(image, base_url), ""]
            caption = node.find("figcaption")
            if caption:
                output += [f"*{clean(inline(caption, base_url))}*", ""]
    text = "\n".join(output)
    return re.sub(r"\n{3,}", "\n\n", text).strip() + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--url", help="Fetch this public page")
    source.add_argument("--html", type=Path, help="Convert a saved HTML file")
    parser.add_argument("--base-url", help="Required with --html so relative links resolve")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--refresh", action="store_true")
    args = parser.parse_args()
    if args.html and not args.base_url:
        parser.error("--base-url is required with --html")
    url = args.url or args.base_url
    body = args.html.read_bytes() if args.html else Fetcher().get(url, refresh=args.refresh)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(to_markdown(body, url), encoding="utf-8")
    print(f"Saved {args.output}")


if __name__ == "__main__":
    main()
