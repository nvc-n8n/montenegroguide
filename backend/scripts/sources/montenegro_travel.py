"""Montenegro.travel national tourism portal ingestor.

Secondary/enrichment source from the national tourism organization.
Website: https://www.montenegro.travel/
"""

import logging
import time
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup
from slugify import slugify

from scripts.sources.base import BaseIngestor

logger = logging.getLogger(__name__)


class MontenegroTravelIngestor(BaseIngestor):
    source_key = "montenegro_travel"
    source_name = "Montenegro Travel (National)"
    base_url = "https://www.montenegro.travel"
    source_type = "official_national"

    # Key pages to scrape for coastal content
    CONTENT_PAGES = {
        "en/destinations/coastal-region": None,  # General coastal
        "en/explore/beaches": "plaze",
        "en/explore/cultural-heritage": "znamenitosti",
        "en/explore/nature": "priroda-vidikovci",
        "en/explore/active-holiday": "aktivni-odmor",
        "en/explore/gastronomy-and-wine": "restorani-beach-barovi",
    }

    # Map of known place-to-municipality associations
    PLACE_MUNICIPALITY_HINTS = {
        "old town kotor": "kotor",
        "our lady of the rocks": "kotor",
        "perast": "kotor",
        "sveti stefan": "budva",
        "citadela": "budva",
        "porto montenegro": "tivat",
        "stari bar": "bar",
        "ulcinj old town": "ulcinj",
        "velika plaza": "ulcinj",
        "long beach": "ulcinj",
        "ada bojana": "ulcinj",
        "herceg novi old town": "herceg-novi",
        "kanli kula": "herceg-novi",
        "forte mare": "herceg-novi",
        "island flowers": "tivat",
    }

    COASTAL_MUNICIPALITIES = {"herceg-novi", "kotor", "tivat", "budva", "bar", "ulcinj"}

    def __init__(self, db):
        super().__init__(db)
        self.client = httpx.Client(
            timeout=30,
            follow_redirects=True,
            headers={
                "User-Agent": "MontenegroGuide/1.0 (data aggregation)",
                "Accept": "text/html",
                "Accept-Language": "en",
            },
        )

    def _fetch_page(self, url: str) -> BeautifulSoup | None:
        try:
            resp = self.client.get(url)
            resp.raise_for_status()
            return BeautifulSoup(resp.text, "lxml")
        except Exception as e:
            logger.warning(f"[montenegro_travel] Failed to fetch {url}: {e}")
            return None

    def _guess_municipality(self, name: str, text: str = "") -> str | None:
        combined = f"{name} {text}".lower()
        for hint, muni in self.PLACE_MUNICIPALITY_HINTS.items():
            if hint in combined:
                return muni
        for muni in self.COASTAL_MUNICIPALITIES:
            normalized = muni.replace("-", " ")
            if normalized in combined:
                return muni
        return None

    def ingest(self, municipality_slug: str = None):
        for path, default_category in self.CONTENT_PAGES.items():
            url = f"{self.base_url}/{path}"
            logger.info(f"[montenegro_travel] Fetching: {url}")

            soup = self._fetch_page(url)
            if not soup:
                continue

            # Extract content cards/links
            links = []
            for a in soup.select("a[href]"):
                href = a.get("href", "")
                if not href or href.startswith("#"):
                    continue
                full_url = urljoin(url, href)
                text = a.get_text(strip=True)
                if text and len(text) > 3:
                    img = a.find("img")
                    img_url = None
                    if img:
                        img_url = img.get("src") or img.get("data-src")
                        if img_url:
                            img_url = urljoin(url, img_url)
                    links.append({"url": full_url, "title": text, "image_url": img_url})

            for link in links[:20]:
                name = link["title"]
                m_slug = self._guess_municipality(name)

                if municipality_slug and m_slug != municipality_slug:
                    continue
                if not m_slug:
                    continue  # Skip non-coastal places

                category_slug = default_category or "znamenitosti"

                place_data = {
                    "name": name,
                    "municipality_slug": m_slug,
                    "category_slug": category_slug,
                    "source_url": link["url"],
                    "source_type": "official_national",
                }

                try:
                    place = self.upsert_place(place_data)
                    if link.get("image_url"):
                        from app.models import PlaceImage
                        from sqlalchemy import select
                        existing = self.db.execute(
                            select(PlaceImage).where(
                                PlaceImage.place_id == place.id,
                                PlaceImage.original_url == link["image_url"],
                            )
                        ).scalars().first()
                        if not existing:
                            self.db.add(PlaceImage(
                                place_id=place.id,
                                original_url=link["image_url"],
                                alt_text=name,
                                source_page_url=link["url"],
                                license_status="needs_review",
                                sort_order=0,
                                is_primary=True,
                            ))
                    self.store_source_record(
                        source_url=link["url"],
                        raw_payload={"title": name},
                        municipality_slug=m_slug,
                        normalized_slug=place.slug,
                    )
                except Exception as e:
                    logger.error(f"[montenegro_travel] Failed to upsert {name}: {e}")
                    self.stats["failed"] += 1

            self.db.commit()
            time.sleep(2)
