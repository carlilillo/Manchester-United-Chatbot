---
name: matches
description: Research Manchester United men's and women's fixtures, results, written reports and standings.
---

# Matches

For a known table or schedule, the orchestrator should delegate its archive path to
Research Subagent. The researcher calls `searchSpecificFile` with `file_paths` to
read the complete document before extracting rows or claiming a complete listing.

| Requested source | Archive path |
| --- | --- |
| Men's Premier League standings | `matches/standings-men-premier-league.md` |
| Men's Champions League standings | `matches/standings-men-champions-league.md` |
| Women's Super League standings | `matches/standings-women-super-league.md` |
| Men's fixtures | `matches/mens-fixtures.md` |
| Women's fixtures | `matches/womens-fixtures.md` |
| Men's results | `matches/mens-results.md` |
| Women's results | `matches/womens-results.md` |

Example: `searchSpecificFile({"file_paths":["matches/standings-men-premier-league.md"]})`.
For questions spanning tables, request only the relevant paths (up to ten per call).

Use `source: "matches"` with `search_manchester_united_documentation` for an unknown
report or source. Include the teams, competition and match date. Read returned
`/retrieved/` excerpts with `read_file`; use the archive path in search metadata with
`searchSpecificFile` when the complete report or additional context is needed.

Available sources include men's/women's fixtures and results, written match reports,
and Premier League, Champions League and Women's Super League standings. Fixtures
cover the capture month plus three months; results cover the capture month plus two
preceding months. These windows move with ingestion, not with the current question.

For broad schedules and standings, prefer the complete documents above. Do not claim a complete schedule/table from a few matching
chunks. Search by both opponents and the match date for written reports. Distinguish
scores from upcoming fixtures and keep competition, season and capture dates clear.
