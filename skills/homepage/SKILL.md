---
name: homepage
description: Research the stories, videos, matches and promotions in the archived Manchester United homepage highlights.
---

# Homepage

Use `source: "homepage"` with `search_manchester_united_documentation`. Search for the
highlight topic or a section name such as Latest news, United Women news, Matches,
or Academy latest. Read returned `/retrieved/` excerpts with `read_file`.

For an overview of all archived highlights, the orchestrator should delegate
`homepage/highlights.md` directly to Research Subagent. The researcher calls
`searchSpecificFile({"file_paths":["homepage/highlights.md"]})` for the full page.

The source is `homepage/highlights.md`, a structured snapshot with titles, official
links, images and match facts. Search the news topic by story title when the visitor wants article detail.
Do not call these highlights today's news unless the capture date supports that claim.
