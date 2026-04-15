"""Wikidata enrichment ingestor.

Used for: alternate names, structured enrichment, multilingual normalization.
Not a primary source — enriches existing records with Wikidata identifiers and labels.
"""

import logging
import time

import httpx
from slugify import slugify
from sqlalchemy import select

from app.models import Place
from scripts.sources.base import BaseIngestor

logger = logging.getLogger(__name__)

WIKIDATA_SPARQL = "https://query.wikidata.org/sparql"

# SPARQL queries for Montenegrin coastal municipalities
MUNICIPALITY_QUERIES = {
    "herceg-novi": 'wd:Q193547',  # Herceg Novi
    "kotor": 'wd:Q182168',       # Kotor
    "tivat": 'wd:Q207382',       # Tivat
    "budva": 'wd:Q185657',       # Budva
    "bar": 'wd:Q189789',         # Bar
    "ulcinj": 'wd:Q193488',      # Ulcinj
}


class WikidataIngestor(BaseIngestor):
    source_key = "wikidata"
    source_name = "Wikidata"
    base_url = "https://www.wikidata.org"
    source_type = "knowledge_base"

    def __init__(self, db):
        super().__init__(db)
        self.client = httpx.Client(
            timeout=30,
            headers={
                "User-Agent": "MontenegroGuide/1.0 (https://github.com/montenegroguide; montenegroguide@example.com) python-httpx",
                "Accept": "application/sparql-results+json",
            },
        )

    def _sparql_query(self, query: str) -> list[dict]:
        try:
            resp = self.client.get(WIKIDATA_SPARQL, params={"query": query, "format": "json"})
            resp.raise_for_status()
            data = resp.json()
            return data.get("results", {}).get("bindings", [])
        except Exception as e:
            logger.error(f"[wikidata] SPARQL query failed: {e}")
            return []

    # Center coordinates for geo-radius search
    MUNICIPALITY_CENTERS = {
        "herceg-novi": (42.45, 18.53),
        "kotor": (42.43, 18.77),
        "tivat": (42.43, 18.70),
        "budva": (42.29, 18.84),
        "bar": (42.09, 19.10),
        "ulcinj": (41.93, 19.21),
    }

    def _build_poi_query(self, municipality_wikidata_id: str, municipality_slug: str = None) -> str:
        # Use geo-radius search centered on the municipality
        center = self.MUNICIPALITY_CENTERS.get(municipality_slug, (42.3, 18.8))
        lat, lng = center
        return f"""
SELECT DISTINCT ?item ?itemLabel ?itemDescription ?coord ?image
  ?nameEn ?nameSr ?nameSrLatn ?nameDe ?nameIt
WHERE {{
  SERVICE wikibase:around {{
    ?item wdt:P625 ?coord .
    bd:serviceParam wikibase:center "Point({lng} {lat})"^^geo:wktLiteral .
    bd:serviceParam wikibase:radius "15" .
  }}
  OPTIONAL {{ ?item wdt:P18 ?image }}
  OPTIONAL {{ ?item rdfs:label ?nameEn FILTER(LANG(?nameEn) = "en") }}
  OPTIONAL {{ ?item rdfs:label ?nameSr FILTER(LANG(?nameSr) = "sr") }}
  OPTIONAL {{ ?item rdfs:label ?nameSrLatn FILTER(LANG(?nameSrLatn) = "sr-Latn") }}
  OPTIONAL {{ ?item rdfs:label ?nameDe FILTER(LANG(?nameDe) = "de") }}
  OPTIONAL {{ ?item rdfs:label ?nameIt FILTER(LANG(?nameIt) = "it") }}
  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en,sr-Latn,sr,de" }}
}}
LIMIT 200
"""

    def _parse_coordinates(self, coord_str: str) -> tuple[float, float] | None:
        """Parse WKT Point coordinates from Wikidata."""
        # Format: Point(lng lat)
        if not coord_str or "Point(" not in coord_str:
            return None
        try:
            inner = coord_str.replace("Point(", "").replace(")", "")
            parts = inner.strip().split()
            lng = float(parts[0])
            lat = float(parts[1])
            return lat, lng
        except (ValueError, IndexError):
            return None

    def ingest(self, municipality_slug: str = None):
        slugs = [municipality_slug] if municipality_slug else list(MUNICIPALITY_QUERIES.keys())

        for m_slug in slugs:
            wd_id = MUNICIPALITY_QUERIES.get(m_slug)
            if not wd_id:
                continue

            logger.info(f"[wikidata] Querying for {m_slug} ({wd_id})")
            query = self._build_poi_query(wd_id, municipality_slug=m_slug)
            results = self._sparql_query(query)
            logger.info(f"[wikidata] Got {len(results)} results for {m_slug}")

            for binding in results:
                name = binding.get("itemLabel", {}).get("value", "")
                if not name or len(name) < 2:
                    continue

                item_uri = binding.get("item", {}).get("value", "")
                coord_str = binding.get("coord", {}).get("value", "")
                coords = self._parse_coordinates(coord_str)

                alt_names = set()
                for key in ["nameEn", "nameSr", "nameSrLatn", "nameDe", "nameIt"]:
                    val = binding.get(key, {}).get("value", "")
                    if val and val != name:
                        alt_names.add(val)

                image_url = binding.get("image", {}).get("value")

                # Try to find and enrich existing place
                slug_candidate = f"{m_slug}-{slugify(name, max_length=200)}"
                existing = self.db.execute(
                    select(Place).where(Place.slug == slug_candidate)
                ).scalars().first()

                if existing:
                    # Enrich with coordinates and alt names
                    if coords and not existing.lat:
                        existing.lat, existing.lng = coords
                    if alt_names:
                        current = set(existing.alternate_names or [])
                        current.update(alt_names)
                        existing.alternate_names = list(current)
                    self.stats["updated"] += 1
                    self.stats["seen"] += 1
                else:
                    # Create new place only if we have coordinates
                    if not coords:
                        self.stats["seen"] += 1
                        continue

                    place_data = {
                        "name": name,
                        "municipality_slug": m_slug,
                        "category_slug": "znamenitosti",  # Default for wikidata POIs
                        "lat": coords[0],
                        "lng": coords[1],
                        "alternate_names": list(alt_names),
                        "source_url": item_uri,
                        "source_type": "wikidata",
                    }

                    try:
                        place = self.upsert_place(place_data)

                        # Store Wikimedia Commons image if available
                        if image_url:
                            from app.models import PlaceImage
                            existing_img = self.db.execute(
                                select(PlaceImage).where(
                                    PlaceImage.place_id == place.id,
                                    PlaceImage.original_url == image_url,
                                )
                            ).scalars().first()
                            if not existing_img:
                                self.db.add(PlaceImage(
                                    place_id=place.id,
                                    original_url=image_url,
                                    alt_text=name,
                                    source_page_url=item_uri,
                                    license_label="Wikimedia Commons",
                                    license_status="needs_review",
                                    sort_order=0,
                                    is_primary=True,
                                ))

                        self.store_source_record(
                            source_url=item_uri,
                            raw_payload=binding,
                            municipality_slug=m_slug,
                            normalized_slug=place.slug,
                            external_id=item_uri.split("/")[-1],
                        )
                    except Exception as e:
                        logger.error(f"[wikidata] Failed to upsert {name}: {e}")
                        self.stats["failed"] += 1

            self.db.commit()
            time.sleep(3)  # Be polite to Wikidata
