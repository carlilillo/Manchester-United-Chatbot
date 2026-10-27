"""Scrape 2026/27 membership tiers and FAQ; parse a saved ticketing comparison page."""

from __future__ import annotations

import argparse
from pathlib import Path

from common import CLUB_BASE, DEFAULT_DATA, Fetcher, clean, soup_for, write_json


MEMBERSHIP_URL = f"{CLUB_BASE}/en/become-a-member-in-2026-27"
TICKETING_URL = "https://tickets.manutd.com/memberships"


def membership_page(html: bytes) -> dict:
    soup = soup_for(html)
    main = soup.main or soup
    tiers = []
    for heading in main.find_all("h2"):
        title = clean(heading.get_text(" ", strip=True))
        if "Membership" not in title:
            continue
        section = heading.find_parent("section")
        if section:
            tiers.append({"title": title,
                          "text": clean(section.get_text(" ", strip=True)),
                          "images": [image.get("src") for image in section.find_all("img", src=True)]})
    faq = []
    for block in main.select('section[data-testid="faq-block"]'):
        heading = block.find("h3")
        group = clean(heading.get_text(" ", strip=True)) if heading else ""
        for item in block.select('div[class*="expandableSection"]'):
            question = item.find("button")
            answer = item.find("section")
            if question:
                faq.append({"group": group,
                            "question": clean(question.get_text(" ", strip=True)),
                            "answer": clean(answer.get_text(" ", strip=True)) if answer else ""})
    return {"url": MEMBERSHIP_URL, "tiers": tiers, "faq": faq}


def ticketing_comparison(html: bytes) -> dict:
    soup = soup_for(html)
    tables = []
    for table in soup.select("table"):
        rows = []
        for row in table.select("tr"):
            cells = [clean(cell.get_text(" ", strip=True))
                     for cell in row.find_all(["th", "td"])]
            if cells:
                rows.append(cells)
        if rows:
            tables.append(rows)
    return {"url": TICKETING_URL, "tables": tables}


def scrape(output: Path, ticketing_html: Path | None = None, refresh: bool = False) -> dict:
    fetcher = Fetcher()
    result = {"membership": membership_page(fetcher.get(MEMBERSHIP_URL, refresh=refresh))}
    if ticketing_html:
        result["ticketing"] = ticketing_comparison(ticketing_html.read_bytes())
    else:
        try:
            result["ticketing"] = ticketing_comparison(fetcher.get(TICKETING_URL, refresh=refresh))
        except RuntimeError as exc:
            result["ticketing"] = {"url": TICKETING_URL, "error": str(exc),
                                   "hint": "The ticketing site may return HTTP 403 to a script. Save the rendered page HTML from a normal browser and pass --ticketing-html PATH."}
    write_json(output, result)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_DATA / "membership.json")
    parser.add_argument("--ticketing-html", type=Path, help="Browser-saved rendered ticketing page HTML")
    parser.add_argument("--refresh", action="store_true")
    args = parser.parse_args()
    result = scrape(args.output, args.ticketing_html, args.refresh)
    print(f"Saved {len(result['membership']['faq'])} FAQ entries to {args.output}")


if __name__ == "__main__":
    main()
