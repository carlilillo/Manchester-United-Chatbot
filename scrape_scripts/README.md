# Manchester United scraping scripts

These scripts recreate the data collection behind [`man_united_data`](../man_united_data/README.md). The temporary scripts from the October 4 capture had been removed, so these are maintained, project-relative versions of that workflow. Running them fetches the **current** pages, which may differ from the existing archive.

## Run

From the OrderAgent project root:

```bash
.venv/bin/python scrape_scripts/run_all.py
```

Each scraper can also be run separately, for example:

```bash
.venv/bin/python scrape_scripts/scrape_news.py --pages 20
.venv/bin/python scrape_scripts/scrape_store.py
.venv/bin/python scrape_scripts/scrape_people.py
.venv/bin/python scrape_scripts/scrape_matches.py
.venv/bin/python scrape_scripts/scrape_videos_travel.py
.venv/bin/python scrape_scripts/scrape_membership.py
.venv/bin/python scrape_scripts/scrape_standings.py
```

The scripts use `requests` and `beautifulsoup4`, which are already listed in the project's `pyproject.toml`. Fetched HTML is cached in `scrape_scripts/.cache/html/`, and extracted JSON is written to `scrape_scripts/.cache/extracted/`. Nothing overwrites the existing Markdown archive by default. Use `--refresh` to fetch pages again.

## Files

| Script | Data collected |
|---|---|
| `scrape_news.py` | Homepage and first 20 news pages, individual article metadata and structured body |
| `scrape_store.py` | Men/women kit and trainingwear category pages, product sizes, fit, material, images, price |
| `scrape_people.py` | Men/women player profiles and linked staff biographies |
| `scrape_matches.py` | Men/women fixtures, results, match reports, and scoring events |
| `scrape_videos_travel.py` | United Women video descriptions and Getting Here directions/images |
| `scrape_membership.py` | Membership tiers, FAQ, and ticketing comparison table when available |
| `scrape_standings.py` | Club tables when rendered, official WSL table, UEFA results and calculated league-phase stats |
| `html_to_markdown.py` | General HTML main-content to Markdown conversion without repeated layout |
| `common.py` | HTTP cache, Next.js data extraction, text and JSON helpers |
| `run_all.py` | Runs every topic scraper |

The ticketing site may return HTTP 403 to command-line requests. In that case, save the **rendered** ticketing page HTML in a browser and pass `--ticketing-html /path/to/page.html` to `scrape_membership.py` or `run_all.py`. Club standings can likewise require browser rendering; pass their saved pages with `--premier-league-html` and `--champions-league-html`. When no Champions League table is available, the script records a separate statistical table calculated from UEFA's published results and marks it as unofficial.

For a simple static page, convert its main content directly:

```bash
.venv/bin/python scrape_scripts/html_to_markdown.py \
  --url https://www.manutd.com/en/club/visit-old-trafford/getting-here \
  --output /tmp/getting-here.md
```

The news and match pages embed story data in Next.js scripts rather than the visible server HTML. Use the topic scrapers for those pages; the generic HTML converter is intended for ordinary page content. When publishing captured prose, keep summaries and source links instead of reproducing full copyrighted articles.
