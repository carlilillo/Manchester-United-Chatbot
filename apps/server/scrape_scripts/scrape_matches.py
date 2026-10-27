"""Scrape men/women fixtures, results, and each result's match-centre report."""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urljoin

from common import CLUB_BASE, DEFAULT_DATA, Fetcher, clean, rich_blocks, rsc_records, soup_for, walk, write_json


def match_listing(url: str, html: bytes) -> dict:
    soup = soup_for(html)
    matches: list[dict] = []
    for record in rsc_records(soup):
        groups = next((node["groups"] for node in walk(record)
                       if isinstance(node, dict) and isinstance(node.get("groups"), list)
                       and node["groups"] and isinstance(node["groups"][0], dict)
                       and "items" in node["groups"][0]), None)
        if groups is None:
            continue
        for month in groups:
            for item in month.get("items", []):
                props = next((node["fixtureProps"] for node in walk(item)
                              if isinstance(node, dict) and isinstance(node.get("fixtureProps"), dict)), None)
                if props is None:
                    continue
                kickoff = next((node.get("kickOffUtc", "") for node in walk(item)
                                if isinstance(node, dict) and "kickOffUtc" in node), "")
                ctas = props.get("ctas") or []
                match_href = next((c.get("url", "") for c in ctas if c.get("text") == "Match Centre"), "")
                report_href = next((c.get("url", "") for c in ctas if c.get("text") == "Match Report"), "")
                matches.append({
                    "date_utc": kickoff,
                    "month": month.get("monthName", ""),
                    "competition": props.get("leagueTitle", ""),
                    "venue": props.get("matchLocation", ""),
                    "status": props.get("matchStatus", ""),
                    "home": props.get("home", {}).get("clubName", ""),
                    "away": props.get("away", {}).get("clubName", ""),
                    "home_score": props.get("home", {}).get("score"),
                    "away_score": props.get("away", {}).get("score"),
                    "match_url": urljoin(CLUB_BASE, match_href) if match_href else "",
                    "report_url": urljoin(CLUB_BASE, report_href) if report_href else "",
                })
        break
    return {"url": url, "matches": matches}


def match_detail(url: str, html: bytes) -> dict:
    soup = soup_for(html)
    meta = soup.find("meta", property="og:image")
    records = list(rsc_records(soup))
    report = next((node for record in records for node in walk(record)
                   if isinstance(node, dict) and "bodyCopy" in node and "summary" in node), None)
    goals: list[dict] = []
    seen: set[tuple] = set()
    for record in records:
        for node in walk(record):
            if not isinstance(node, dict) or node.get("event") not in ("Goal", "OwnGoal", "PenaltyGoal"):
                continue
            key = (node.get("event"), node.get("playerName"), node.get("minute"))
            if key not in seen:
                seen.add(key)
                goals.append({"type": node.get("event"), "minute": node.get("minute"),
                              "player": node.get("playerName"), "assist": node.get("goalAssistPlayerName"),
                              "sort_order": node.get("sortOrder", 0)})
    goals.sort(key=lambda item: item["sort_order"])
    body: list[dict[str, str]] = []
    if report:
        for node in walk(report.get("bodyCopy")):
            if isinstance(node, dict) and isinstance(node.get("document"), dict):
                rich = node["document"].get("json", {})
                body = rich_blocks(rich)
                if body:
                    break
    return {"url": url, "title": report.get("title", "") if report else "",
            "summary": report.get("summary", "") if report else "",
            "image_url": meta.get("content", "") if meta else "",
            "body": body, "scoring_events": goals,
            "written_report_available": bool(report)}


def scrape(output: Path, refresh: bool = False) -> dict:
    fetcher = Fetcher()
    listings: dict[str, dict] = {}
    for team in ("mens", "womens"):
        listings[team] = {}
        for kind in ("fixtures", "results"):
            url = f"{CLUB_BASE}/en/matches/{team}-team/{kind}"
            listings[team][kind] = match_listing(url, fetcher.get(url, refresh=refresh))
    urls = sorted({match["match_url"] for team in listings.values()
                   for match in team["results"]["matches"] if match["match_url"]})
    def get_one(url: str) -> dict:
        try:
            return match_detail(url, fetcher.get(url, refresh=refresh))
        except RuntimeError as exc:
            return {"url": url, "error": str(exc)}
    with ThreadPoolExecutor(max_workers=3) as pool:
        reports = list(pool.map(get_one, urls))
    result = {"listings": listings, "reports": reports}
    write_json(output, result)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_DATA / "matches.json")
    parser.add_argument("--refresh", action="store_true")
    args = parser.parse_args()
    result = scrape(args.output, args.refresh)
    print(f"Saved {len(result['reports'])} match-centre records to {args.output}")


if __name__ == "__main__":
    main()
