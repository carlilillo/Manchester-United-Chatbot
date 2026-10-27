"""Shared HTTP, Next.js, and serialization helpers for ManUtd scrapers."""

from __future__ import annotations

import hashlib
import json
import re
import time
from pathlib import Path
from typing import Any, Iterator

import requests
from bs4 import BeautifulSoup


PROJECT_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_CACHE = Path(__file__).resolve().parent / ".cache" / "html"
DEFAULT_DATA = Path(__file__).resolve().parent / ".cache" / "extracted"
CLUB_BASE = "https://www.manutd.com"
STORE_BASE = "https://store.manutd.com"


class Fetcher:
    def __init__(self, cache: Path = DEFAULT_CACHE, timeout: int = 45, delay: float = 0.2):
        self.cache = cache
        self.timeout = timeout
        self.delay = delay
        self.cache.mkdir(parents=True, exist_ok=True)

    def path(self, url: str) -> Path:
        return self.cache / (hashlib.sha256(url.encode()).hexdigest()[:16] + ".html")

    def get(self, url: str, refresh: bool = False) -> bytes:
        path = self.path(url)
        if path.exists() and not refresh:
            return path.read_bytes()
        last_error: Exception | None = None
        for attempt in range(3):
            try:
                response = requests.get(
                    url,
                    timeout=self.timeout,
                    headers={"User-Agent": "Mozilla/5.0 (compatible; ManchesterUnitedArchive/1.0)"},
                )
                response.raise_for_status()
                path.write_bytes(response.content)
                if self.delay:
                    time.sleep(self.delay)
                return response.content
            except requests.RequestException as exc:
                last_error = exc
                if attempt < 2:
                    time.sleep(2 * (attempt + 1))
        raise RuntimeError(f"Could not fetch {url}: {last_error}")


def soup_for(body: bytes) -> BeautifulSoup:
    return BeautifulSoup(body, "html.parser")


def clean(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def rsc_payload(soup: BeautifulSoup) -> str:
    """Decode Next.js self.__next_f.push chunks embedded in server HTML."""
    decoder = json.JSONDecoder()
    chunks: list[str] = []
    for script in soup.find_all("script"):
        raw = script.string or ""
        cursor = 0
        while True:
            start = raw.find("self.__next_f.push(", cursor)
            if start < 0:
                break
            start += len("self.__next_f.push(")
            try:
                obj, length = decoder.raw_decode(raw[start:])
            except json.JSONDecodeError:
                break
            cursor = start + length
            if isinstance(obj, list) and len(obj) > 1 and obj[0] == 1 and isinstance(obj[1], str):
                chunks.append(obj[1])
    return "".join(chunks)


def rsc_records(soup: BeautifulSoup) -> Iterator[Any]:
    for line in rsc_payload(soup).splitlines():
        if ":" not in line:
            continue
        try:
            yield json.loads(line.split(":", 1)[1])
        except json.JSONDecodeError:
            continue


def walk(node: Any) -> Iterator[Any]:
    yield node
    if isinstance(node, dict):
        for child in node.values():
            yield from walk(child)
    elif isinstance(node, list):
        for child in node:
            yield from walk(child)


def rich_text(node: Any) -> str:
    if isinstance(node, dict):
        if node.get("nodeType") == "text":
            return node.get("value", "")
        return "".join(rich_text(child) for child in node.get("content", []))
    if isinstance(node, list):
        return "".join(rich_text(child) for child in node)
    return ""


def rich_blocks(node: Any) -> list[dict[str, str]]:
    """Preserve rich-text paragraphs, headings, and list items in source order."""
    blocks: list[dict[str, str]] = []
    def visit(value: Any) -> None:
        if isinstance(value, dict):
            kind = value.get("nodeType", "")
            if kind in {"paragraph", "heading-1", "heading-2", "heading-3", "heading-4", "list-item"}:
                text = clean(rich_text(value))
                if text:
                    blocks.append({"type": kind, "text": text})
                return
            for child in value.get("content", []):
                visit(child)
        elif isinstance(value, list):
            for child in value:
                visit(child)
    visit(node)
    return blocks
