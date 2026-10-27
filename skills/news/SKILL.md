---
name: news
description: Research Manchester United news articles and compact news listings, including United Women news.
---

# News

Use `source: "news"` with `search_manchester_united_documentation`. Include the story
title, people, team, event or date. Read returned `/retrieved/` excerpts with `read_file`.

News listings contain only each story's title, official source and image. For story
details, search by its title or subject to find article excerpts. The researcher may
then call `searchSpecificFile` with an archive path from search metadata for the full
article. Do not guess the hashed article filename.

For a numbered news page, the orchestrator should delegate the known path directly
to Research Subagent, which calls `searchSpecificFile`:

- Page 1: `news/pages/page-01.md`.
- Page 2: `news/pages/page-02.md`.
- General form: `news/pages/page-{number}.md`, padding to at least two digits (100 stays 100).

Example: `searchSpecificFile({"file_paths":["news/pages/page-01.md"]})`.
Read the complete page for all listed titles and official links. Available page counts
depend on ingestion configuration; do not assume a requested page exists. If missing,
report that and use semantic search for relevant stories. Listings do not contain
article bodies, so search for a story when more detail is requested.

Distinguish article publication dates from archive capture dates. Search relevant
article excerpts before asserting detailed facts; never present a compact listing as
a full article or an archived news page as a live feed.
