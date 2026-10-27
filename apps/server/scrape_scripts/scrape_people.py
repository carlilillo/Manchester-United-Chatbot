"""Scrape men's and women's player profiles and linked coaching-staff profiles."""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urljoin

from common import CLUB_BASE, DEFAULT_DATA, Fetcher, clean, soup_for, write_json


LISTINGS = {
    "men": f"{CLUB_BASE}/en/teams/mens-team",
    "women": f"{CLUB_BASE}/en/teams/womens-team",
    "staff": f"{CLUB_BASE}/en/man-utd-head-coach-and-staff",
}


def detail_links(group: str, html: bytes) -> list[str]:
    soup = soup_for(html)
    prefix = {
        "men": "/en/teams/mens-team/",
        "women": "/en/teams/womens-team/",
        "staff": "/en/man-utd-head-coach-and-staff/",
    }[group]
    main = soup.main or soup
    return list(dict.fromkeys(urljoin(CLUB_BASE, a["href"])
                              for a in main.find_all("a", href=True)
                              if a["href"].startswith(prefix)))


def profile(group: str, url: str, html: bytes) -> dict:
    soup = soup_for(html)
    main = soup.main or soup
    if group == "staff":
        heading = main.find("h1")
        paragraphs: list[str] = []
        for para in main.find_all("p"):
            value = clean(para.get_text(" ", strip=True))
            if len(value) > 35 and value not in paragraphs:
                paragraphs.append(value)
        image = soup.find("meta", property="og:image")
        return {"url": url, "group": group,
                "name": clean(heading.get_text(" ", strip=True)) if heading else "",
                "bio": paragraphs[:12],
                "image_url": image.get("content", "") if image else ""}
    hero = main.select_one('[data-testid="profile-hero"]')
    if not hero:
        return {"url": url, "group": group, "error": "Profile hero not found"}
    def field(selector: str) -> str:
        tag = hero.select_one(selector)
        return clean(tag.get_text(" ", strip=True)) if tag else ""
    name = clean(field('[data-testid="profile-hero__first-name"]') + " " +
                 field('[data-testid="profile-hero__last-name"]'))
    image = hero.select_one('[data-testid="profile-hero__profile-image"] img')
    og_image = soup.find("meta", property="og:image")
    career: dict[str, str] = {}
    for stat in main.select('[data-testid^="key-bio-highlights__stat--"]'):
        title = stat.select_one('[data-testid="basic-stat-title"]')
        value = stat.select_one('[data-testid="basic-stat-value"]')
        if title:
            career[clean(title.get_text(" ", strip=True))] = (
                clean(value.get_text(" ", strip=True)) if value else "")
    bio = main.select_one('[class*="profileBio_profileBio"]')
    return {"url": url, "group": group, "name": name,
            "number": field('[data-testid="profile-hero__squad-number"]'),
            "country_shown": field('[class*="countryName"]'),
            "age": field('[data-testid="profile-hero__age"]'),
            "position": field('[data-testid="profile-hero__position"]'),
            "united_career": career,
            "bio": [clean(p.get_text(" ", strip=True)) for p in bio.find_all("p")] if bio else [],
            "image_url": urljoin(CLUB_BASE, image.get("src", "")) if image else
                         og_image.get("content", "") if og_image else "",
            "image_alt": image.get("alt", "") if image else name + " profile image"}


def scrape(output: Path, refresh: bool = False) -> dict:
    fetcher = Fetcher()
    listings = {group: detail_links(group, fetcher.get(url, refresh=refresh))
                for group, url in LISTINGS.items()}
    tasks = [(group, url) for group, urls in listings.items() for url in urls]
    def get_one(task: tuple[str, str]) -> dict:
        group, url = task
        try:
            return profile(group, url, fetcher.get(url, refresh=refresh))
        except RuntimeError as exc:
            return {"url": url, "group": group, "error": str(exc)}
    with ThreadPoolExecutor(max_workers=3) as pool:
        people = list(pool.map(get_one, tasks))
    result = {"listing_urls": LISTINGS, "people": people}
    write_json(output, result)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_DATA / "people.json")
    parser.add_argument("--refresh", action="store_true")
    args = parser.parse_args()
    result = scrape(args.output, args.refresh)
    print(f"Saved {len(result['people'])} people to {args.output}")


if __name__ == "__main__":
    main()
