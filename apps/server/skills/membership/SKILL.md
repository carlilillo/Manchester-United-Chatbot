---
name: membership
description: Research Manchester United membership tiers, benefits, comparisons and available FAQs.
---

# Membership

Use `source: "membership"` with `search_manchester_united_documentation`. Include the
tier, season or benefit and read returned `/retrieved/` excerpts with `read_file`.

For tier comparisons, the orchestrator should delegate `membership/comparison.md`
directly to Research Subagent. The researcher calls
`searchSpecificFile({"file_paths":["membership/comparison.md"]})` and reads the full
comparison before extracting tiers, prices or benefits. Use semantic search for FAQ
questions and details not covered by that document. If the file is missing, report
the gap and search for available evidence instead of inventing a comparison.

Prices and benefits are snapshots, not guaranteed current offers.
Include capture dates when available and official membership links.
