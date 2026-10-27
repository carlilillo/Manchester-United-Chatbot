---
name: store
description: Research individual Manchester United Store products and their available details.
---

# Store

Use `source: "store"` with `search_manchester_united_documentation`. Include product
name, kit season, home/away/third, gender or clothing type. Read the returned
`/retrieved/` excerpts with `read_file`.

The archive contains individual `store/products/` documents, not category catalogs.
Products may include descriptions, materials, reviews and one Complete the Look
section. Recommended products are distinct from the product being described; a
customer review is not an official specification. You may also like is excluded.

Search each product separately for comparisons. When full product details are needed,
pass the archive path from search metadata to Research Subagent for `searchSpecificFile`.
Do not guess hashed product filenames or request the retired catalog files. Only quote prices, sizes or stock
when present in the evidence, with the capture date if available. Cite the official
product link for current purchase information; archived data is not live inventory.
