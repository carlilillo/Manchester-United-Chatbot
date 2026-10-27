"""Scrape United Women video descriptions and Old Trafford 'Getting Here' directions."""

from __future__ import annotations

import argparse
import re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urljoin

from common import CLUB_BASE, DEFAULT_DATA, PROJECT_ROOT, Fetcher, clean, soup_for, write_json


TRAVEL_URL = f"{CLUB_BASE}/en/club/visit-old-trafford/getting-here"


def video_links(home_html: bytes, include_archive: bool = True) -> list[str]:
    soup = soup_for(home_html)
    heading = next((h for h in soup.find_all(["h2", "h3"])
                    if clean(h.get_text(" ", strip=True)) == "Women's videos"), None)
    urls: list[str] = []
    if heading:
        section = heading.find_parent("section") or list(heading.parents)[3]
        urls = [urljoin(CLUB_BASE, a["href"]) for a in section.find_all("a", href=True)
                if "/mutv/videos/detail/" in a["href"]]
    if include_archive:
        for path in (PROJECT_ROOT / "man_united_data" / "videos" / "women").glob("*.md"):
            for url in re.findall(r"https://www\.manutd\.com/en/mutv/videos/detail/[\w-]+", path.read_text()):
                urls.append(url)
    return list(dict.fromkeys(urls))


def video_detail(url: str, html: bytes) -> dict:
    soup = soup_for(html)
    def meta(key: str) -> str:
        tag = soup.find("meta", property=key)
        return tag.get("content", "") if tag else ""
    description = meta("og:description")
    if not description:
        tag = soup.find("meta", attrs={"name": "description"})
        description = tag.get("content", "") if tag else ""
    return {"url": url, "title": meta("og:title") or (clean(soup.h1.get_text(" ", strip=True)) if soup.h1 else ""),
            "description": clean(description), "image_url": meta("og:image"),
            "video_url": meta("og:video") or meta("og:video:url")}


def getting_here(url: str, html: bytes) -> dict:
    soup = soup_for(html)
    main = soup.main or soup
    for node in main.select("nav,footer,header,aside,script,style"):
        node.decompose()
    headings = [clean(h.get_text(" ", strip=True)) for h in main.find_all(["h1", "h2", "h3"])]
    blocks = []
    for node in main.find_all(["h1", "h2", "h3", "p", "li"]):
        value = clean(node.get_text(" ", strip=True))
        if value and (node.name.startswith("h") or len(value) > 25):
            blocks.append({"type": node.name, "text": value})
    images = [{"alt": image.get("alt", ""), "url": urljoin(CLUB_BASE, image["src"])}
              for image in main.find_all("img", src=True)]
    links = [{"text": clean(a.get_text(" ", strip=True)), "url": urljoin(CLUB_BASE, a["href"])}
             for a in main.find_all("a", href=True)]
    return {"url": url, "headings": headings, "blocks": blocks,
            "images": images, "links": links}


def scrape(output: Path, refresh: bool = False, include_archive: bool = True) -> dict:
    fetcher = Fetcher()
    links = video_links(fetcher.get(f"{CLUB_BASE}/en", refresh=refresh), include_archive)
    def get_one(url: str) -> dict:
        try:
            return video_detail(url, fetcher.get(url, refresh=refresh))
        except RuntimeError as exc:
            return {"url": url, "error": str(exc)}
    with ThreadPoolExecutor(max_workers=3) as pool:
        videos = list(pool.map(get_one, links))
    travel = getting_here(TRAVEL_URL, fetcher.get(TRAVEL_URL, refresh=refresh))
    result = {"videos": videos, "getting_here": travel}
    write_json(output, result)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_DATA / "videos_travel.json")
    parser.add_argument("--refresh", action="store_true")
    parser.add_argument("--no-archive", action="store_true", help="Do not revisit videos in the existing archive")
    args = parser.parse_args()
    result = scrape(args.output, args.refresh, not args.no_archive)
    print(f"Saved {len(result['videos'])} videos and directions to {args.output}")


if __name__ == "__main__":
    main()
