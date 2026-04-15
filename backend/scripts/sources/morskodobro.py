"""JP Morsko Dobro ingestor.

Primary source of truth for beaches and bathing areas along the Montenegrin coast.
Website: https://www.morskodobro.me/
"""

import logging
import time
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup
from slugify import slugify

from scripts.sources.base import BaseIngestor

logger = logging.getLogger(__name__)


class MorskoDobroIngestor(BaseIngestor):
    source_key = "morskodobro"
    source_name = "JP Morsko Dobro"
    base_url = "https://www.morskodobro.me"
    source_type = "official_government"

    # Municipality mapping for Morsko Dobro pages
    BEACH_PAGES = {
        "herceg-novi": ["/en/beaches/herceg-novi", "/en/kupalisni-kompleksi/herceg-novi"],
        "kotor": ["/en/beaches/kotor", "/en/kupalisni-kompleksi/kotor"],
        "tivat": ["/en/beaches/tivat", "/en/kupalisni-kompleksi/tivat"],
        "budva": ["/en/beaches/budva", "/en/kupalisni-kompleksi/budva"],
        "bar": ["/en/beaches/bar", "/en/kupalisni-kompleksi/bar"],
        "ulcinj": ["/en/beaches/ulcinj", "/en/kupalisni-kompleksi/ulcinj"],
    }

    def __init__(self, db):
        super().__init__(db)
        self.client = httpx.Client(
            timeout=30,
            follow_redirects=True,
            headers={
                "User-Agent": "MontenegroGuide/1.0 (beach data aggregation)",
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
            logger.warning(f"[morskodobro] Failed to fetch {url}: {e}")
            return None

    def _extract_beaches_from_listing(self, soup: BeautifulSoup, base_url: str) -> list[dict]:
        """Extract beach entries from a Morsko Dobro listing page."""
        beaches = []

        # Try various selectors for beach listings
        for selector in [".beach-item", ".card", "article", ".listing-item", ".item", ".post"]:
            items = soup.select(selector)
            if len(items) >= 2:
                for item in items:
                    title_el = item.find(["h2", "h3", "h4", "a"])
                    if not title_el:
                        continue
                    name = title_el.get_text(strip=True)
                    if not name or len(name) < 2:
                        continue

                    link = item.find("a", href=True)
                    detail_url = urljoin(base_url, link["href"]) if link else None

                    desc_el = item.find("p")
                    desc = desc_el.get_text(strip=True) if desc_el else None

                    img = item.find("img")
                    img_url = None
                    if img:
                        img_url = img.get("src") or img.get("data-src")
                        if img_url:
                            img_url = urljoin(base_url, img_url)

                    beaches.append({
                        "name": name,
                        "detail_url": detail_url,
                        "short_description": desc,
                        "image_url": img_url,
                    })
                break

        # Fallback: just find all links with text
        if not beaches:
            for a in soup.find_all("a", href=True):
                text = a.get_text(strip=True)
                href = a.get("href", "")
                if text and len(text) > 3 and ("beach" in href.lower() or "plaza" in href.lower()):
                    beaches.append({
                        "name": text,
                        "detail_url": urljoin(base_url, href),
                        "short_description": None,
                        "image_url": None,
                    })

        return beaches

    def _extract_beach_detail(self, soup: BeautifulSoup, url: str) -> dict:
        """Extract details from a beach detail page."""
        title_el = soup.find("h1")
        title = title_el.get_text(strip=True) if title_el else ""

        desc = ""
        for selector in [".entry-content", ".post-content", ".content", "article", "main"]:
            el = soup.select_one(selector)
            if el:
                paragraphs = el.find_all("p")
                if paragraphs:
                    desc = " ".join(p.get_text(strip=True) for p in paragraphs if p.get_text(strip=True))
                else:
                    desc = el.get_text(strip=True)
                if len(desc) > 30:
                    break

        # Images
        images = []
        for img in soup.find_all("img"):
            src = img.get("src") or img.get("data-src")
            if not src:
                continue
            src = urljoin(url, src)
            src_lower = src.lower()
            if any(x in src_lower for x in ["logo", "icon", "avatar", "footer"]):
                continue
            images.append({
                "url": src,
                "alt": img.get("alt", ""),
            })

        # Look for amenity info
        amenities = []
        for icon_text in soup.select(".amenity, .feature, .service"):
            text = icon_text.get_text(strip=True)
            if text:
                amenities.append(text)

        short = desc[:300].rsplit(" ", 1)[0] + "..." if len(desc) > 300 else desc

        return {
            "title": title,
            "short_description": short if short else None,
            "long_description": desc if len(desc) > 300 else None,
            "images": images[:8],
            "amenities": amenities,
        }

    def ingest(self, municipality_slug: str = None):
        slugs = [municipality_slug] if municipality_slug else list(self.BEACH_PAGES.keys())

        for m_slug in slugs:
            paths = self.BEACH_PAGES.get(m_slug, [])

            for path in paths:
                url = f"{self.base_url}{path}"
                logger.info(f"[morskodobro] Fetching beach listing: {url}")

                soup = self._fetch_page(url)
                if not soup:
                    continue

                beaches = self._extract_beaches_from_listing(soup, url)
                logger.info(f"[morskodobro] Found {len(beaches)} beaches for {m_slug} from {url}")

                for beach in beaches[:30]:
                    name = beach["name"]

                    detail = {}
                    if beach.get("detail_url"):
                        time.sleep(1)
                        detail_soup = self._fetch_page(beach["detail_url"])
                        if detail_soup:
                            detail = self._extract_beach_detail(detail_soup, beach["detail_url"])

                    final_name = detail.get("title") or name

                    place_data = {
                        "name": final_name,
                        "municipality_slug": m_slug,
                        "category_slug": "plaze",
                        "short_description": detail.get("short_description") or beach.get("short_description"),
                        "long_description": detail.get("long_description"),
                        "amenities": detail.get("amenities", []),
                        "source_url": beach.get("detail_url") or url,
                        "source_type": "official_government",
                        "featured": True,
                        "family_friendly": True,
                        "beach_type": "mixed",
                        "tags": ["beach", "swimming", "sun"],
                        "best_for": ["swimming", "sunbathing", "relaxation"],
                    }

                    try:
                        place = self.upsert_place(place_data)

                        # Image records
                        from app.models import PlaceImage
                        from sqlalchemy import select

                        images = detail.get("images", [])
                        if not images and beach.get("image_url"):
                            images = [{"url": beach["image_url"], "alt": final_name}]

                        for i, img_info in enumerate(images[:5]):
                            existing = self.db.execute(
                                select(PlaceImage).where(
                                    PlaceImage.place_id == place.id,
                                    PlaceImage.original_url == img_info["url"],
                                )
                            ).scalars().first()
                            if not existing:
                                self.db.add(PlaceImage(
                                    place_id=place.id,
                                    original_url=img_info["url"],
                                    alt_text=img_info.get("alt") or final_name,
                                    source_page_url=beach.get("detail_url") or url,
                                    license_status="needs_review",
                                    sort_order=i,
                                    is_primary=(i == 0),
                                ))

                        self.store_source_record(
                            source_url=beach.get("detail_url") or url,
                            raw_payload={"name": final_name, "detail": detail},
                            municipality_slug=m_slug,
                            normalized_slug=place.slug,
                        )
                    except Exception as e:
                        logger.error(f"[morskodobro] Failed to upsert {name}: {e}")
                        self.stats["failed"] += 1

                self.db.commit()
                time.sleep(2)
