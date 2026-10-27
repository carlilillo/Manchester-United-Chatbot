---
name: videos
description: Find archived Manchester United video titles, images and official watch links, especially United Women videos.
---

# Videos

Use `source: "videos"` with `search_manchester_united_documentation`. Search by video
title, player, team or event, then read returned `/retrieved/` excerpts with `read_file`.
Homepage highlights can also contain video cards; search `source: "homepage"` when
needed for highlighted videos.

For the complete archived United Women listing, the orchestrator should delegate
`videos/women.md` to Research Subagent. The researcher calls
`searchSpecificFile({"file_paths":["videos/women.md"]})`. For individual videos, discover
an archive path through semantic search before requesting its complete document.

The archive contains a United Women video listing and available detail pages. Use
titles, images and watch links actually present in the excerpts. A video card does
not establish what was said in the video; do not invent a transcript or claim to have
watched it. Lists reflect their capture time and may be incomplete search results.
