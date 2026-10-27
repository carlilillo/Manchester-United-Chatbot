---
name: people
description: Research Manchester United men's players, women's players, staff, biographies and available statistics.
---

# People

Use `source: "people"` with `search_manchester_united_documentation`. Search by team,
position or person, then read returned `/retrieved/` excerpts with `read_file`.

Roster sources (`people/men.md`, `people/women.md`) group players by position and
include names, numbers and images. `people/staff.md` includes names, roles and images.
Individual profiles contain biographies, bio cards, United Career totals and available
Key Stats, Shooting/Goalkeeping, Possession and Defending cards. Related news is excluded.

For a full roster or staff list, the orchestrator should delegate the relevant path
above to Research Subagent. The researcher uses `searchSpecificFile` with `file_paths`
to read the complete list, for example `{"file_paths":["people/women.md"]}`. For an
individual profile, discover its archive path through semantic search and use exact
lookup when more context is needed; do not guess the hashed profile filename. For statistics, search the named person and the exact
category. Distinguish United Career totals from current season cards. Missing cards
or fields mean unavailable, not zero. Roles and rosters are captured snapshots.
