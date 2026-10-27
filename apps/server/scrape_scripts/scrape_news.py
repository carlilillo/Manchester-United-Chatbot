"""Scrape the homepage and the first 20 Manchester United news listing pages."""

from __future__ import annotations

import argparse
import json
import re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urljoin

from common import CLUB_BASE, DEFAULT_DATA, Fetcher, clean, rich_blocks, rsc_records, soup_for, walk, write_json


YOUTH = re.compile(r"\b(?:u18s?|u19s?|u21s?|under.?18s?|under.?19s?|under.?21s?|academy|youth)\b", re.I)


def listing_cards(html: bytes) -> list[dict[str, str]]:
    cards: list[dict[str, str]] = []
    seen: set[str] = set()
    for card in soup_for(html).select('article[data-testid="article-card"]'):
        anchor = card.select_one('a[data-testid="article-card__floating-link"]')
        if not anchor or not anchor.get("href"):
            continue
        url = urljoin(CLUB_BASE, anchor["href"])
        if url in seen:
            continue
        seen.add(url)
        title = card.find(["h3", "h4", "h5"])
        category = card.select_one('a[data-testid="category-link"]')
        date = card.select_one('[data-testid="publish-date"]')
        image = card.find("img")
        cards.append({
            "url": url,
            "title": clean(title.get_text(" ", strip=True) if title else anchor.get_text(" ", strip=True)),
            "category": clean(category.get_text(" ", strip=True)) if category else "",
            "relative_date": clean(date.get_text(" ", strip=True)) if date else "",
            "image_url": urljoin(CLUB_BASE, image.get("src", "")) if image else "",
            "image_alt": image.get("alt", "") if image else "",
        })
    return cards


def article_detail(url: str, html: bytes) -> dict:
    soup = soup_for(html)
    article = next(
        (node for record in rsc_records(soup) for node in walk(record)
         if isinstance(node, dict) and isinstance(node.get("articleTitle"), str) and "bodyCopy" in node),
        None,
    )
    if article is None:
        return {"url": url, "error": "Article data not found in server response"}
    image = article.get("image") or {}
    if not isinstance(image, dict):
        image = {}
    scoreplay = image.get("scoreplayImage") or {}
    if not isinstance(scoreplay, dict):
        scoreplay = {}
    author = article.get("author") or {}
    if isinstance(author, dict):
        author = clean(" ".join(filter(None, (author.get("firstName"), author.get("secondName")))))
    body = article.get("bodyCopy") or {}
    rich = body.get("json", {}) if isinstance(body, dict) else {}
    links = sorted(set(re.findall(r'https?://[^\s"<>]+', json.dumps(rich))))
    featured_video = article.get("featuredVideo")
    return {
        "url": url,
        "title": article.get("articleTitle", ""),
        "summary": article.get("summary", ""),
        "format": article.get("format", ""),
        "published": article.get("publishDate", ""),
        "author": author,
        "image_alt": image.get("alt", ""),
        "image_caption": image.get("caption", ""),
        "image_url": scoreplay.get("cdnUrl") or image.get("url") or "",
        "featured_video": featured_video if isinstance(featured_video, dict) else None,
        "body": rich_blocks(rich),
        "body_links": links[:30],
    }


def scrape(pages: int, limit: int | None, output: Path, refresh: bool = False) -> dict:
    fetcher = Fetcher()
    by_url: dict[str, dict] = {}
    page_urls: dict[str, list[str]] = {}
    for page in [0, *range(1, pages + 1)]:
        url = f"{CLUB_BASE}/en" if page == 0 else f"{CLUB_BASE}/en/news?page={page}"
        cards = listing_cards(fetcher.get(url, refresh=refresh))
        page_urls[str(page)] = []
        for card in cards:
            if YOUTH.search(card["title"] + " " + card["url"]):
                continue
            by_url.setdefault(card["url"], card)
            page_urls[str(page)].append(card["url"])
    selected = list(by_url)[:limit] if limit else list(by_url)
    def get_one(url: str) -> dict:
        try:
            return article_detail(url, fetcher.get(url, refresh=refresh))
        except RuntimeError as exc:
            return {"url": url, "error": str(exc)}
    with ThreadPoolExecutor(max_workers=3) as pool:
        details = list(pool.map(get_one, selected))
    result = {"source": f"{CLUB_BASE}/en/news", "pages": page_urls,
              "cards": [by_url[url] for url in selected], "articles": details}
    write_json(output, result)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pages", type=int, default=20, help="Number of news pages, starting at page 1")
    parser.add_argument("--limit", type=int, help="Inspect only this many article details")
    parser.add_argument("--output", type=Path, default=DEFAULT_DATA / "news.json")
    parser.add_argument("--refresh", action="store_true", help="Ignore saved HTML cache")
    args = parser.parse_args()
    result = scrape(args.pages, args.limit, args.output, args.refresh)
    print(f"Saved {len(result['articles'])} article records to {args.output}")


if __name__ == "__main__":
    main()
