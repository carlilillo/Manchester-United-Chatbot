"""Run every Manchester United topic scraper and save structured extracts as JSON."""

from __future__ import annotations

import argparse
from pathlib import Path

import scrape_matches
import scrape_membership
import scrape_news
import scrape_people
import scrape_standings
import scrape_store
import scrape_videos_travel
from common import DEFAULT_DATA


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_DATA)
    parser.add_argument("--news-pages", type=int, default=20)
    parser.add_argument("--refresh", action="store_true", help="Ignore previously cached HTML")
    parser.add_argument("--ticketing-html", type=Path)
    parser.add_argument("--premier-league-html", type=Path)
    parser.add_argument("--champions-league-html", type=Path)
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    tasks = [
        ("News", lambda: scrape_news.scrape(args.news_pages, None, args.output_dir / "news.json", args.refresh)),
        ("Store", lambda: scrape_store.scrape(args.output_dir / "store.json", args.refresh)),
        ("People", lambda: scrape_people.scrape(args.output_dir / "people.json", args.refresh)),
        ("Matches", lambda: scrape_matches.scrape(args.output_dir / "matches.json", args.refresh)),
        ("Videos and travel", lambda: scrape_videos_travel.scrape(args.output_dir / "videos_travel.json", args.refresh)),
        ("Membership", lambda: scrape_membership.scrape(args.output_dir / "membership.json", args.ticketing_html, args.refresh)),
        ("Standings", lambda: scrape_standings.scrape(args.output_dir / "standings.json", args.premier_league_html, args.champions_league_html, args.refresh)),
    ]
    for label, task in tasks:
        print(f"Scraping {label}...", flush=True)
        task()
    print(f"Saved all structured extracts to {args.output_dir}")


if __name__ == "__main__":
    main()
