"""Generic ingestor for official *.travel tourism websites.

These sites (hercegnovi.travel, kotor.travel, etc.) share similar structures.
We parse their public pages for attractions, beaches, culture, etc.
"""

import logging
import re
import time
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup
from slugify import slugify

from scripts.sources.base import BaseIngestor

logger = logging.getLogger(__name__)

# Configuration for each tourism site
TOURISM_SITES = {
    "hercegnovi_travel": {
        "municipality_slug": "herceg-novi",
        "base_url": "https://www.hercegnovi.travel",
        "name": "Herceg Novi Tourism",
        "paths": {
            "en/beaches": "plaze",
            "en/attractions": "znamenitosti",
            "en/culture": "muzeji-kultura",
            "en/monasteries-and-churches": "manastiri-crkve",
            "en/fortresses": "tvrdjave-stari-gradovi",
            "en/nature": "priroda-vidikovci",
            "en/gastronomy": "restorani-beach-barovi",
            "en/nightlife": "nocni-zivot",
            "en/active-holiday": "aktivni-odmor",
        },
    },
    "kotor_travel": {
        "municipality_slug": "kotor",
        "base_url": "https://kotor.travel",
        "name": "Kotor Tourism",
        "paths": {
            "en/beaches": "plaze",
            "en/attractions": "znamenitosti",
            "en/culture-and-history": "muzeji-kultura",
            "en/churches": "manastiri-crkve",
            "en/nature": "priroda-vidikovci",
            "en/gastronomy": "restorani-beach-barovi",
            "en/activities": "aktivni-odmor",
        },
    },
    "tivat_travel": {
        "municipality_slug": "tivat",
        "base_url": "https://tivat.travel",
        "name": "Tivat Tourism",
        "paths": {
            "en/beaches": "plaze",
            "en/attractions": "znamenitosti",
            "en/culture": "muzeji-kultura",
            "en/nature": "priroda-vidikovci",
            "en/gastronomy": "restorani-beach-barovi",
            "en/activities": "aktivni-odmor",
        },
    },
    "budva_travel": {
        "municipality_slug": "budva",
        "base_url": "https://budva.travel",
        "name": "Budva Tourism",
        "paths": {
            "en/beaches": "plaze",
            "en/attractions": "znamenitosti",
            "en/culture-and-history": "muzeji-kultura",
            "en/churches-and-monasteries": "manastiri-crkve",
            "en/fortresses": "tvrdjave-stari-gradovi",
            "en/nature": "priroda-vidikovci",
            "en/gastronomy": "restorani-beach-barovi",
            "en/nightlife": "nocni-zivot",
            "en/activities": "aktivni-odmor",
        },
    },
    "bar_travel": {
        "municipality_slug": "bar",
        "base_url": "https://bar.travel",
        "name": "Bar Tourism",
        "paths": {
            "en/beaches": "plaze",
            "en/attractions": "znamenitosti",
            "en/culture": "muzeji-kultura",
            "en/nature": "priroda-vidikovci",
            "en/gastronomy": "restorani-beach-barovi",
            "en/activities": "aktivni-odmor",
        },
    },
    "ulcinj_travel": {
        "municipality_slug": "ulcinj",
        "base_url": "https://ulcinj.travel",
        "name": "Ulcinj Tourism",
        "paths": {
            "en/beaches": "plaze",
            "en/attractions": "znamenitosti",
            "en/culture": "muzeji-kultura",
            "en/nature": "priroda-vidikovci",
            "en/gastronomy": "restorani-beach-barovi",
            "en/activities": "aktivni-odmor",
        },
    },
}


class TourismTravelIngestor(BaseIngestor):
    source_type = "official_tourism"

    def __init__(self, db, site_key: str):
        super().__init__(db)
        config = TOURISM_SITES[site_key]
        self.source_key = site_key
        self.source_name = config["name"]
        self.base_url = config["base_url"]
        self.municipality_slug = config["municipality_slug"]
        self.paths = config["paths"]
        self.client = httpx.Client(
            timeout=30,
            follow_redirects=True,
            headers={
                "User-Agent": "MontenegroGuide/1.0 (tourism data aggregation)",
                "Accept": "text/html",
                "Accept-Language": "en,sr-Latn;q=0.9",
            },
        )

    def _fetch_page(self, url: str) -> BeautifulSoup | None:
        try:
            resp = self.client.get(url)
            resp.raise_for_status()
            return BeautifulSoup(resp.text, "lxml")
        except Exception as e:
            logger.warning(f"[{self.source_key}] Failed to fetch {url}: {e}")
            return None

    def _extract_listing_links(self, soup: BeautifulSoup, base_url: str) -> list[dict]:
        """Extract links to individual places from a listing page.

        Handles common patterns: article links, card links, list item links.
        """
        links = []
        seen_urls = set()

        # Try various common patterns
        selectors = [
            "article a[href]",
            ".card a[href]",
            ".listing-item a[href]",
            ".item a[href]",
            ".post a[href]",
            ".entry a[href]",
            "a.read-more",
            "a.more-link",
            ".content-list a[href]",
            "h2 a[href]",
            "h3 a[href]",
        ]

        for selector in selectors:
            for a in soup.select(selector):
                href = a.get("href", "")
                if not href or href.startswith("#") or href.startswith("javascript:"):
                    continue
                full_url = urljoin(base_url, href)
                if full_url in seen_urls:
                    continue
                # Must be on same domain
                if urlparse(full_url).netloc != urlparse(base_url).netloc:
                    continue
                seen_urls.add(full_url)

                title = a.get_text(strip=True) or ""
                # Try to get image
                img = a.find("img")
                img_url = None
                if img:
                    img_url = img.get("src") or img.get("data-src")
                    if img_url:
                        img_url = urljoin(base_url, img_url)

                if title and len(title) > 2:
                    links.append({
                        "url": full_url,
                        "title": title,
                        "image_url": img_url,
                    })

        return links

    def _extract_place_detail(self, soup: BeautifulSoup, url: str) -> dict:
        """Extract place details from a detail page."""
        # Title
        title_el = soup.find("h1")
        title = title_el.get_text(strip=True) if title_el else ""

        # Description - try main content area
        desc = ""
        for selector in [".entry-content", ".post-content", ".content", "article", ".description", "main"]:
            content_el = soup.select_one(selector)
            if content_el:
                # Get text, strip excessive whitespace
                paragraphs = content_el.find_all("p")
                if paragraphs:
                    desc = " ".join(p.get_text(strip=True) for p in paragraphs if p.get_text(strip=True))
                else:
                    desc = content_el.get_text(strip=True)
                if len(desc) > 50:
                    break

        # Images
        images = []
        seen_srcs = set()
        for img in soup.find_all("img"):
            src = img.get("src") or img.get("data-src")
            if not src:
                continue
            src = urljoin(url, src)
            if src in seen_srcs:
                continue
            # Filter out tiny images, icons, logos
            width = img.get("width")
            height = img.get("height")
            if width and int(width) < 100:
                continue
            if height and int(height) < 100:
                continue
            # Skip common non-content images
            src_lower = src.lower()
            if any(x in src_lower for x in ["logo", "icon", "avatar", "footer", "header-bg", "sprite"]):
                continue
            seen_srcs.add(src)
            images.append({
                "url": src,
                "alt": img.get("alt", ""),
                "credit": None,
                "license_status": "needs_review",
            })

        # Short vs long description
        short = desc[:300].rsplit(" ", 1)[0] + "..." if len(desc) > 300 else desc
        long_desc = desc if len(desc) > 300 else None

        return {
            "title": title,
            "short_description": short if short else None,
            "long_description": long_desc,
            "images": images[:10],  # Cap at 10 images per place
        }

    def _extract_listing_items_direct(self, soup: BeautifulSoup, url: str) -> list[dict]:
        """For pages that list items directly without individual detail pages."""
        items = []

        # Look for card/item patterns with content
        for selector in [".card", ".listing-item", ".item", "article", ".post", ".entry"]:
            cards = soup.select(selector)
            if len(cards) >= 3:  # Likely a listing
                for card in cards:
                    title_el = card.find(["h2", "h3", "h4"])
                    if not title_el:
                        continue
                    title = title_el.get_text(strip=True)
                    if not title or len(title) < 3:
                        continue

                    desc_el = card.find("p")
                    desc = desc_el.get_text(strip=True) if desc_el else ""

                    img = card.find("img")
                    img_url = None
                    if img:
                        img_url = img.get("src") or img.get("data-src")
                        if img_url:
                            img_url = urljoin(url, img_url)

                    link = card.find("a", href=True)
                    detail_url = urljoin(url, link["href"]) if link else url

                    items.append({
                        "title": title,
                        "short_description": desc[:300] if desc else None,
                        "detail_url": detail_url,
                        "images": [{"url": img_url, "alt": title, "credit": None, "license_status": "needs_review"}] if img_url else [],
                    })
                if items:
                    break

        return items

    def ingest(self, municipality_slug: str = None):
        if municipality_slug and municipality_slug != self.municipality_slug:
            return

        for path, category_slug in self.paths.items():
            url = f"{self.base_url}/{path}"
            logger.info(f"[{self.source_key}] Fetching listing: {url}")

            soup = self._fetch_page(url)
            if not soup:
                continue

            # Try extracting individual links first
            links = self._extract_listing_links(soup, url)

            if links:
                for link_info in links[:25]:  # Cap per category
                    time.sleep(1)  # Polite delay
                    logger.info(f"[{self.source_key}] Fetching detail: {link_info['url']}")
                    detail_soup = self._fetch_page(link_info["url"])

                    detail = {}
                    if detail_soup:
                        detail = self._extract_place_detail(detail_soup, link_info["url"])

                    name = detail.get("title") or link_info["title"]
                    if not name or len(name) < 2:
                        continue

                    place_data = {
                        "name": name,
                        "municipality_slug": self.municipality_slug,
                        "category_slug": category_slug,
                        "short_description": detail.get("short_description"),
                        "long_description": detail.get("long_description"),
                        "source_url": link_info["url"],
                        "source_type": "official_tourism",
                        "featured": category_slug in ("plaze", "znamenitosti", "tvrdjave-stari-gradovi"),
                        "cultural_site": category_slug in ("muzeji-kultura", "manastiri-crkve", "tvrdjave-stari-gradovi"),
                        "nightlife": category_slug == "nocni-zivot",
                        "active_holiday": category_slug == "aktivni-odmor",
                        "beach_type": "mixed" if category_slug == "plaze" else None,
                    }

                    try:
                        place = self.upsert_place(place_data)
                        # Store images
                        images = detail.get("images", [])
                        if not images and link_info.get("image_url"):
                            images = [{"url": link_info["image_url"], "alt": name, "credit": None, "license_status": "needs_review"}]

                        self._store_image_records(place, images, link_info["url"])

                        self.store_source_record(
                            source_url=link_info["url"],
                            raw_payload={"title": name, "detail": detail},
                            municipality_slug=self.municipality_slug,
                            normalized_slug=place.slug,
                        )
                    except Exception as e:
                        logger.error(f"[{self.source_key}] Failed to upsert {name}: {e}")
                        self.stats["failed"] += 1
            else:
                # Try direct extraction from listing page
                items = self._extract_listing_items_direct(soup, url)
                for item in items[:25]:
                    name = item["title"]
                    if not name:
                        continue

                    place_data = {
                        "name": name,
                        "municipality_slug": self.municipality_slug,
                        "category_slug": category_slug,
                        "short_description": item.get("short_description"),
                        "source_url": item.get("detail_url", url),
                        "source_type": "official_tourism",
                        "featured": category_slug in ("plaze", "znamenitosti"),
                        "cultural_site": category_slug in ("muzeji-kultura", "manastiri-crkve"),
                        "beach_type": "mixed" if category_slug == "plaze" else None,
                    }

                    try:
                        place = self.upsert_place(place_data)
                        self._store_image_records(place, item.get("images", []), url)
                        self.store_source_record(
                            source_url=url,
                            raw_payload={"title": name, "listing_url": url},
                            municipality_slug=self.municipality_slug,
                            normalized_slug=place.slug,
                        )
                    except Exception as e:
                        logger.error(f"[{self.source_key}] Failed to upsert {name}: {e}")
                        self.stats["failed"] += 1

            self.db.commit()
            time.sleep(2)

    def _store_image_records(self, place, images: list[dict], source_page_url: str):
        """Store image metadata records for a place."""
        from app.models import PlaceImage
        from sqlalchemy import select

        for i, img_info in enumerate(images):
            img_url = img_info.get("url")
            if not img_url:
                continue

            # Check for existing by URL
            existing = self.db.execute(
                select(PlaceImage).where(
                    PlaceImage.place_id == place.id,
                    PlaceImage.original_url == img_url,
                )
            ).scalars().first()

            if existing:
                continue

            img_record = PlaceImage(
                place_id=place.id,
                original_url=img_url,
                alt_text=img_info.get("alt") or place.name,
                source_page_url=source_page_url,
                credit=img_info.get("credit"),
                license_label=img_info.get("license_label"),
                license_status=img_info.get("license_status", "needs_review"),
                sort_order=i,
                is_primary=(i == 0),
            )
            self.db.add(img_record)

        self.db.flush()
