"""Scrape men/women kit and trainingwear categories and every linked product detail."""

from __future__ import annotations

import argparse
import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urljoin

from common import DEFAULT_DATA, STORE_BASE, Fetcher, clean, soup_for, write_json


SECTIONS = {
    f"kit/{kit}/{gender}": f"/en-gb/c/kit/{kit}/{gender}"
    for kit in ("home", "away", "third") for gender in ("mens", "womens")
}
SECTIONS.update({
    f"training/{gender}/{kind}": f"/en-gb/c/trainingwear/{gender}/{kind}"
    for gender in ("mens", "womens")
    for kind in ("tops", "jackets-coats", "trousers-shorts")
})


def category_links(fetcher: Fetcher, path: str, refresh: bool = False) -> tuple[list[str], int]:
    pending = [STORE_BASE + path]
    visited: set[str] = set()
    product_links: list[str] = []
    while pending:
        url = pending.pop(0)
        if url in visited:
            continue
        visited.add(url)
        soup = soup_for(fetcher.get(url, refresh=refresh))
        main = soup.main or soup
        for anchor in main.find_all("a", href=True):
            href = anchor["href"]
            if href.startswith(path + "?page="):
                next_url = urljoin(STORE_BASE, href)
                if next_url not in visited and next_url not in pending:
                    pending.append(next_url)
            elif "/en-gb/p/" in href:
                product = urljoin(STORE_BASE, href.split("?", 1)[0])
                if product not in product_links:
                    product_links.append(product)
    return product_links, len(visited)


def detail_section(soup, title: str):
    label = soup.find(string=lambda text: text and text.strip() == title)
    return label.find_parent("div", class_=lambda c: c and "border-b-primary-black-100" in c) if label else None


def attributes(section) -> dict[str, str]:
    result: dict[str, str] = {}
    if section:
        for para in section.find_all("p"):
            value = clean(para.get_text(" ", strip=True))
            if ":" in value:
                label, text = value.split(":", 1)
                result[clean(label)] = clean(text)
    return result


def product_detail(url: str, html: bytes) -> dict:
    soup = soup_for(html)
    schema = {}
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            obj = json.loads(script.string or script.get_text())
        except json.JSONDecodeError:
            continue
        if isinstance(obj, dict) and obj.get("@type") in ("ProductGroup", "Product"):
            schema = obj
            break
    title = soup.find("h1")
    description_section = detail_section(soup, "Description")
    fit_section = detail_section(soup, "Size and Fit")
    material_section = detail_section(soup, "Materials and Care")
    variants = schema.get("hasVariant", [])
    offers = variants[0].get("offers", {}) if variants else schema.get("offers", {})
    images = schema.get("image", [])
    if isinstance(images, str):
        images = [images]
    brand = schema.get("brand", {})
    if isinstance(brand, dict):
        brand = brand.get("name", "")
    description = ""
    if description_section:
        description = clean(description_section.get_text(" ", strip=True))
        if description.startswith("Description"):
            description = description[len("Description"):].strip()
    return {
        "url": url,
        "name": clean(title.get_text(" ", strip=True)) if title else schema.get("name", ""),
        "price": offers.get("price", ""),
        "currency": offers.get("priceCurrency", ""),
        "availability": offers.get("availability", ""),
        "brand": brand,
        "sizes": list(dict.fromkeys(clean(v.get("size")) for v in variants if v.get("size"))),
        "description": description or schema.get("description", ""),
        "fit": attributes(fit_section),
        "material_and_care": attributes(material_section),
        "images": list(dict.fromkeys(images)),
    }


def scrape(output: Path, refresh: bool = False, limit: int | None = None) -> dict:
    fetcher = Fetcher()
    categories: dict[str, dict] = {}
    belongs_to: dict[str, list[str]] = {}
    for section, path in SECTIONS.items():
        links, page_count = category_links(fetcher, path, refresh=refresh)
        categories[section] = {"url": STORE_BASE + path, "pages": page_count, "products": len(links)}
        for url in links:
            belongs_to.setdefault(url, []).append(section)
    urls = list(belongs_to)[:limit] if limit else list(belongs_to)
    def get_one(url: str) -> dict:
        try:
            item = product_detail(url, fetcher.get(url, refresh=refresh))
        except RuntimeError as exc:
            item = {"url": url, "error": str(exc)}
        item["categories"] = belongs_to[url]
        return item
    with ThreadPoolExecutor(max_workers=3) as pool:
        products = list(pool.map(get_one, urls))
    result = {"categories": categories, "products": products}
    write_json(output, result)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_DATA / "store.json")
    parser.add_argument("--refresh", action="store_true")
    parser.add_argument("--limit", type=int, help="Inspect only this many linked products")
    args = parser.parse_args()
    result = scrape(args.output, args.refresh, args.limit)
    print(f"Saved {len(result['products'])} product records to {args.output}")


if __name__ == "__main__":
    main()
