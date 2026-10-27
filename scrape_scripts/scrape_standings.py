"""Scrape available league tables and derive Champions League stats from UEFA results."""

from __future__ import annotations

import argparse
import re
from pathlib import Path

from common import CLUB_BASE, DEFAULT_DATA, Fetcher, clean, soup_for, write_json


PL_URL = f"{CLUB_BASE}/en/matches/mens-team/table/premier-league/20262027-premier-league"
UCL_URL = f"{CLUB_BASE}/en/matches/mens-team/table/uefa-champions-league/20262027-uefa-champions-league"
WSL_URL = "https://www1.wslfootball.com/standings/wsl"
UEFA_RESULTS_URL = "https://www.uefa.com/uefachampionsleague/news/02a8-2174c9e9019d-f909a77bd77a-1000--2026-27-uefa-champions-league-all-the-league-phase-fixtures/"


def tables(html: bytes) -> list[list[list[str]]]:
    soup = soup_for(html)
    result = []
    for table in soup.select("main table, table"):
        rows = [[clean(cell.get_text(" ", strip=True)) for cell in row.find_all(["th", "td"])]
                for row in table.select("tr")]
        rows = [row for row in rows if row]
        if len(rows) > 1 and rows not in result:
            result.append(rows)
    return result


def champions_league_results(html: bytes) -> list[dict]:
    soup = soup_for(html)
    heading = next((h for h in soup.find_all(["h2", "h3"])
                    if clean(h.get_text(" ", strip=True)) == "Matchday 1"), None)
    if not heading:
        return []
    games = []
    for node in heading.next_elements:
        if getattr(node, "name", None) == "h2":
            break
        if getattr(node, "name", None) != "a":
            continue
        label = clean(node.get_text(" ", strip=True))
        match = re.fullmatch(r"(.+?)\s+(\d+)\s*[-–]\s*(\d+)\s+(.+)", label)
        if match:
            home, hg, ag, away = match.groups()
            game = {"home": home, "home_score": int(hg),
                    "away": away, "away_score": int(ag)}
            if game not in games:
                games.append(game)
    return games


def calculated_table(games: list[dict]) -> list[dict]:
    stats: dict[str, dict] = {}
    for game in games:
        for club, gf, ga in ((game["home"], game["home_score"], game["away_score"]),
                             (game["away"], game["away_score"], game["home_score"])):
            stats[club] = {"club": club, "played": 1, "wins": int(gf > ga),
                           "draws": int(gf == ga), "losses": int(gf < ga),
                           "goals_for": gf, "goals_against": ga,
                           "goal_difference": gf - ga,
                           "points": 3 if gf > ga else 1 if gf == ga else 0}
    return sorted(stats.values(), key=lambda row: (-row["points"],
                   -row["goal_difference"], -row["goals_for"], row["club"]))


def scrape(output: Path, pl_html: Path | None = None, ucl_html: Path | None = None,
           refresh: bool = False) -> dict:
    fetcher = Fetcher()
    def read(url: str, saved: Path | None) -> bytes:
        return saved.read_bytes() if saved else fetcher.get(url, refresh=refresh)
    errors: dict[str, str] = {}
    def optional_tables(label: str, url: str, saved: Path | None = None) -> list[list[list[str]]]:
        try:
            return tables(read(url, saved))
        except RuntimeError as exc:
            errors[label] = str(exc)
            return []
    pl_rows = optional_tables("premier_league", PL_URL, pl_html)
    ucl_rows = optional_tables("champions_league", UCL_URL, ucl_html)
    wsl_rows = optional_tables("womens_super_league", WSL_URL)
    try:
        games = champions_league_results(fetcher.get(UEFA_RESULTS_URL, refresh=refresh))
    except RuntimeError as exc:
        errors["uefa_results"] = str(exc)
        games = []
    result = {
        "premier_league": {"url": PL_URL, "tables": pl_rows},
        "champions_league": {"url": UCL_URL, "tables": ucl_rows,
                             "results_url": UEFA_RESULTS_URL,
                             "matchday_one_results": games,
                             "calculated_table": calculated_table(games),
                             "note": "The calculated order is not an official UEFA ranking."},
        "womens_super_league": {"url": WSL_URL, "tables": wsl_rows},
        "errors": errors,
    }
    write_json(output, result)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_DATA / "standings.json")
    parser.add_argument("--premier-league-html", type=Path, help="Saved browser-rendered club table HTML")
    parser.add_argument("--champions-league-html", type=Path, help="Saved browser-rendered club table HTML")
    parser.add_argument("--refresh", action="store_true")
    args = parser.parse_args()
    result = scrape(args.output, args.premier_league_html, args.champions_league_html, args.refresh)
    print(f"Saved standings; {len(result['champions_league']['matchday_one_results'])} UEFA results to {args.output}")


if __name__ == "__main__":
    main()
