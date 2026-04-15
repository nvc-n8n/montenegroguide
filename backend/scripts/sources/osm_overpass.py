"""OpenStreetMap / Overpass API ingestor.

Fetches POIs from Overpass for each municipality's bounding box.
This is our most reliable source for coordinates and structured metadata.
"""

import logging
import time
import httpx
from slugify import slugify

from scripts.sources.base import BaseIngestor

logger = logging.getLogger(__name__)

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Bounding boxes for each municipality (approximate)
MUNICIPALITY_BOUNDS = {
    "herceg-novi": {"s": 42.37, "w": 18.49, "n": 42.50, "e": 18.60},
    "kotor": {"s": 42.38, "w": 18.68, "n": 42.50, "e": 18.80},
    "tivat": {"s": 42.37, "w": 18.66, "n": 42.44, "e": 18.73},
    "budva": {"s": 42.24, "w": 18.80, "n": 42.33, "e": 18.90},
    "bar": {"s": 42.04, "w": 19.05, "n": 42.18, "e": 19.18},
    "ulcinj": {"s": 41.85, "w": 19.15, "n": 41.98, "e": 19.35},
}

# Category mapping from OSM tags to our categories
OSM_CATEGORY_MAP = {
    "beach": "plaze",
    "castle": "tvrdjave-stari-gradovi",
    "fort": "tvrdjave-stari-gradovi",
    "city_gate": "tvrdjave-stari-gradovi",
    "ruins": "tvrdjave-stari-gradovi",
    "monastery": "manastiri-crkve",
    "church": "manastiri-crkve",
    "place_of_worship": "manastiri-crkve",
    "chapel": "manastiri-crkve",
    "museum": "muzeji-kultura",
    "gallery": "muzeji-kultura",
    "theatre": "muzeji-kultura",
    "library": "muzeji-kultura",
    "archaeological_site": "znamenitosti",
    "memorial": "znamenitosti",
    "monument": "znamenitosti",
    "attraction": "znamenitosti",
    "viewpoint": "priroda-vidikovci",
    "peak": "priroda-vidikovci",
    "nature_reserve": "priroda-vidikovci",
    "park": "priroda-vidikovci",
    "garden": "priroda-vidikovci",
    "restaurant": "restorani-beach-barovi",
    "cafe": "restorani-beach-barovi",
    "nightclub": "nocni-zivot",
    "bar": "nocni-zivot",
    "pub": "nocni-zivot",
    "dive_centre": "aktivni-odmor",
    "sports_centre": "aktivni-odmor",
    "swimming_pool": "aktivni-odmor",
    "water_park": "porodicna-mjesta",
    "playground": "porodicna-mjesta",
    "theme_park": "porodicna-mjesta",
}


class OSMOverpassIngestor(BaseIngestor):
    source_key = "osm_overpass"
    source_name = "OpenStreetMap / Overpass"
    base_url = "https://overpass-api.de/api/interpreter"
    source_type = "osm"

    def _build_query(self, bounds: dict) -> str:
        s, w, n, e = bounds["s"], bounds["w"], bounds["n"], bounds["e"]
        bbox = f"{s},{w},{n},{e}"
        return f"""
[out:json][timeout:60];
(
  node["tourism"~"attraction|museum|viewpoint|gallery|artwork|information"]({bbox});
  node["historic"~"castle|fort|monument|memorial|archaeological_site|ruins|city_gate|monastery"]({bbox});
  node["natural"="beach"]({bbox});
  node["leisure"~"beach_resort|nature_reserve|park|garden|swimming_pool|water_park|playground"]({bbox});
  node["amenity"~"place_of_worship|theatre|restaurant|cafe|nightclub|bar|pub|library"]({bbox});
  node["sport"~"diving|surfing|sailing"]({bbox});
  way["natural"="beach"]({bbox});
  way["historic"~"castle|fort|ruins|city_gate"]({bbox});
  way["leisure"~"park|nature_reserve|garden"]({bbox});
);
out center tags;
"""

    def _classify_osm_tags(self, tags: dict) -> str:
        """Determine our category from OSM tags."""
        for key in ["natural", "historic", "tourism", "amenity", "leisure"]:
            val = tags.get(key, "")
            if val in OSM_CATEGORY_MAP:
                return OSM_CATEGORY_MAP[val]
        return "znamenitosti"

    def _extract_beach_type(self, tags: dict) -> str | None:
        surface = tags.get("surface", "")
        if "sand" in surface:
            return "sandy"
        if "pebble" in surface or "gravel" in surface:
            return "pebble"
        if "rock" in surface or "concrete" in surface:
            return "rocky"
        if tags.get("natural") == "beach":
            return "mixed"
        return None

    def _get_best_name(self, tags: dict) -> str | None:
        for key in ["name:en", "name", "name:sr-Latn", "name:sr", "name:de"]:
            if key in tags:
                return tags[key]
        return None

    def _get_alternate_names(self, tags: dict) -> list[str]:
        names = set()
        for key in ["name", "name:en", "name:sr", "name:sr-Latn", "name:de", "name:it", "alt_name"]:
            if key in tags and tags[key]:
                names.add(tags[key])
        return list(names)

    def ingest(self, municipality_slug: str = None):
        slugs = [municipality_slug] if municipality_slug else list(MUNICIPALITY_BOUNDS.keys())

        for m_slug in slugs:
            bounds = MUNICIPALITY_BOUNDS.get(m_slug)
            if not bounds:
                logger.warning(f"No bounds for {m_slug}, skipping")
                continue

            logger.info(f"[osm] Querying Overpass for {m_slug}...")
            query = self._build_query(bounds)

            try:
                resp = httpx.post(
                    OVERPASS_URL,
                    data={"data": query},
                    timeout=90,
                    headers={"User-Agent": "MontenegroGuide/1.0 (data ingestion)"},
                )
                resp.raise_for_status()
                data = resp.json()
            except Exception as e:
                logger.error(f"[osm] Overpass request failed for {m_slug}: {e}")
                self.stats["failed"] += 1
                continue

            elements = data.get("elements", [])
            logger.info(f"[osm] Got {len(elements)} elements for {m_slug}")

            for el in elements:
                tags = el.get("tags", {})
                name = self._get_best_name(tags)
                if not name:
                    continue

                lat = el.get("lat") or el.get("center", {}).get("lat")
                lng = el.get("lon") or el.get("center", {}).get("lon")

                category_slug = self._classify_osm_tags(tags)
                beach_type = self._extract_beach_type(tags) if category_slug == "plaze" else None

                is_church = tags.get("amenity") == "place_of_worship" or tags.get("historic") == "monastery"
                is_cultural = tags.get("tourism") in ("museum", "gallery") or tags.get("amenity") in ("theatre", "library")

                place_data = {
                    "name": name,
                    "municipality_slug": m_slug,
                    "category_slug": category_slug,
                    "lat": lat,
                    "lng": lng,
                    "alternate_names": self._get_alternate_names(tags),
                    "short_description": tags.get("description") or tags.get("description:en"),
                    "tags": [v for k, v in tags.items() if k.startswith("tourism") or k.startswith("historic")],
                    "beach_type": beach_type,
                    "cultural_site": is_cultural or is_church,
                    "source_url": f"https://www.openstreetmap.org/node/{el.get('id', '')}",
                    "source_type": "osm",
                }

                try:
                    place = self.upsert_place(place_data)
                    self.store_source_record(
                        source_url=place_data["source_url"],
                        raw_payload={"osm_id": el.get("id"), "tags": tags, "type": el.get("type")},
                        municipality_slug=m_slug,
                        normalized_slug=place.slug,
                        external_id=str(el.get("id")),
                    )
                except Exception as e:
                    logger.error(f"[osm] Failed to upsert {name}: {e}")
                    self.stats["failed"] += 1

            self.db.commit()
            time.sleep(2)  # Be polite to Overpass
