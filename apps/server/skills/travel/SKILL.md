---
name: travel
description: Research official directions and transport information for getting to Old Trafford.
---

# Travel

Use `source: "travel"` with `search_manchester_united_documentation`. Include the
visitor's transport mode, origin or requested stadium access information. Read the
returned `/retrieved/` excerpts with `read_file`.

`travel/getting-here.md` identifies the archived official guidance for driving,
cycling, taxis and public transport. The orchestrator can delegate this known path
directly to Research Subagent, which calls
`searchSpecificFile({"file_paths":["travel/getting-here.md"]})` for the full guide.
Use semantic search for targeted discovery or when that file is unavailable.

Only give routes, fares, parking access or travel times supported by the retrieved
guidance. Treat estimates as estimates, identify capture dates when present, and cite
the official source for current arrangements.
