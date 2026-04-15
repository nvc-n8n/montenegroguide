"""Base class for all source ingestors."""

import logging
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Optional

from slugify import slugify
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models import (
    DataSource, SourceRecord, IngestionRun,
    Municipality, Category, Place, PlaceImage,
)

logger = logging.getLogger(__name__)


class BaseIngestor(ABC):
    source_key: str = ""
    source_name: str = ""
    base_url: str = ""
    source_type: str = "official"

    MUNICIPALITY_MAP = {
        "herceg novi": "herceg-novi",
        "herceg-novi": "herceg-novi",
        "kotor": "kotor",
        "tivat": "tivat",
        "budva": "budva",
        "bar": "bar",
        "ulcinj": "ulcinj",
    }

    CATEGORY_MAP = {
        "beach": "plaze",
        "beaches": "plaze",
        "plaža": "plaze",
        "plaže": "plaze",
        "attraction": "znamenitosti",
        "attractions": "znamenitosti",
        "sightseeing": "znamenitosti",
        "fortress": "tvrdjave-stari-gradovi",
        "fortresses": "tvrdjave-stari-gradovi",
        "old town": "tvrdjave-stari-gradovi",
        "old towns": "tvrdjave-stari-gradovi",
        "monastery": "manastiri-crkve",
        "monasteries": "manastiri-crkve",
        "church": "manastiri-crkve",
        "churches": "manastiri-crkve",
        "museum": "muzeji-kultura",
        "museums": "muzeji-kultura",
        "culture": "muzeji-kultura",
        "nature": "priroda-vidikovci",
        "viewpoint": "priroda-vidikovci",
        "viewpoints": "priroda-vidikovci",
        "restaurant": "restorani-beach-barovi",
        "restaurants": "restorani-beach-barovi",
        "beach bar": "restorani-beach-barovi",
        "gastronomy": "restorani-beach-barovi",
        "nightlife": "nocni-zivot",
        "club": "nocni-zivot",
        "clubs": "nocni-zivot",
        "bar": "nocni-zivot",
        "activity": "aktivni-odmor",
        "activities": "aktivni-odmor",
        "sport": "aktivni-odmor",
        "sports": "aktivni-odmor",
        "adventure": "aktivni-odmor",
        "family": "porodicna-mjesta",
        "hidden gem": "hidden-gems",
        "hidden gems": "hidden-gems",
    }

    def __init__(self, db: Session):
        self.db = db
        self.run: Optional[IngestionRun] = None
        self.data_source: Optional[DataSource] = None
        self.stats = {
            "seen": 0,
            "created": 0,
            "updated": 0,
            "failed": 0,
        }

    def ensure_data_source(self):
        existing = self.db.execute(
            select(DataSource).where(DataSource.source_key == self.source_key)
        ).scalars().first()

        if existing:
            self.data_source = existing
        else:
            self.data_source = DataSource(
                source_key=self.source_key,
                name=self.source_name,
                base_url=self.base_url,
                source_type=self.source_type,
                active=True,
            )
            self.db.add(self.data_source)
            self.db.flush()

    def start_run(self):
        self.run = IngestionRun(
            source_key=self.source_key,
            status="running",
        )
        self.db.add(self.run)
        self.db.flush()

    def finish_run(self, status: str = "completed", notes: str = None):
        if self.run:
            self.run.finished_at = datetime.now(timezone.utc)
            self.run.status = status
            self.run.records_seen = self.stats["seen"]
            self.run.records_created = self.stats["created"]
            self.run.records_updated = self.stats["updated"]
            self.run.records_failed = self.stats["failed"]
            self.run.notes = notes
            self.db.commit()

    def get_or_create_municipality(self, slug: str) -> Municipality:
        m = self.db.execute(
            select(Municipality).where(Municipality.slug == slug)
        ).scalars().first()
        if not m:
            name_map = {
                "herceg-novi": "Herceg Novi",
                "kotor": "Kotor",
                "tivat": "Tivat",
                "budva": "Budva",
                "bar": "Bar",
                "ulcinj": "Ulcinj",
            }
            m = Municipality(slug=slug, name=name_map.get(slug, slug.title()))
            self.db.add(m)
            self.db.flush()
        return m

    def get_or_create_category(self, slug: str) -> Category:
        c = self.db.execute(
            select(Category).where(Category.slug == slug)
        ).scalars().first()
        if not c:
            name_map = {
                "plaze": "Plaže",
                "znamenitosti": "Znamenitosti",
                "tvrdjave-stari-gradovi": "Tvrđave i stari gradovi",
                "manastiri-crkve": "Manastiri i crkve",
                "muzeji-kultura": "Muzeji i kultura",
                "priroda-vidikovci": "Priroda i vidikovci",
                "restorani-beach-barovi": "Restorani i beach barovi",
                "nocni-zivot": "Noćni život",
                "aktivni-odmor": "Aktivni odmor",
                "porodicna-mjesta": "Porodična mjesta",
                "hidden-gems": "Hidden Gems",
            }
            c = Category(slug=slug, name=name_map.get(slug, slug.replace("-", " ").title()))
            self.db.add(c)
            self.db.flush()
        return c

    def normalize_category(self, raw: str) -> str:
        raw_lower = raw.lower().strip()
        return self.CATEGORY_MAP.get(raw_lower, "znamenitosti")

    def normalize_municipality_slug(self, raw: str) -> str:
        raw_lower = raw.lower().strip()
        return self.MUNICIPALITY_MAP.get(raw_lower, slugify(raw_lower))

    def make_slug(self, name: str, municipality_slug: str) -> str:
        return f"{municipality_slug}-{slugify(name, max_length=200)}"

    def upsert_place(self, data: dict) -> Place:
        """Upsert a place from normalized data dict.

        Expected keys: name, municipality_slug, category_slug, and optional fields.
        """
        self.stats["seen"] += 1

        municipality = self.get_or_create_municipality(data["municipality_slug"])
        category = self.get_or_create_category(data["category_slug"])
        slug = data.get("slug") or self.make_slug(data["name"], data["municipality_slug"])

        existing = self.db.execute(
            select(Place).where(Place.slug == slug)
        ).scalars().first()

        if existing:
            # Update fields that are not empty in new data
            for field in [
                "short_description", "long_description", "lat", "lng",
                "tags", "amenities", "best_for", "subtype", "beach_type",
                "source_url", "source_type", "alternate_names",
            ]:
                new_val = data.get(field)
                if new_val:
                    setattr(existing, field, new_val)
            # Update boolean flags only if explicitly set
            for flag in [
                "featured", "family_friendly", "hidden_gem", "nightlife",
                "active_holiday", "cultural_site", "parking_available", "pet_friendly",
            ]:
                if flag in data:
                    setattr(existing, flag, data[flag])
            self.stats["updated"] += 1
            self.db.flush()
            return existing
        else:
            place = Place(
                slug=slug,
                name=data["name"],
                alternate_names=data.get("alternate_names", []),
                municipality_id=municipality.id,
                category_id=category.id,
                subtype=data.get("subtype"),
                lat=data.get("lat"),
                lng=data.get("lng"),
                short_description=data.get("short_description"),
                long_description=data.get("long_description"),
                tags=data.get("tags", []),
                amenities=data.get("amenities", []),
                best_for=data.get("best_for", []),
                featured=data.get("featured", False),
                popularity_score=data.get("popularity_score", 0),
                family_friendly=data.get("family_friendly", False),
                hidden_gem=data.get("hidden_gem", False),
                nightlife=data.get("nightlife", False),
                active_holiday=data.get("active_holiday", False),
                cultural_site=data.get("cultural_site", False),
                beach_type=data.get("beach_type"),
                parking_available=data.get("parking_available", False),
                pet_friendly=data.get("pet_friendly", False),
                accessibility_notes=data.get("accessibility_notes"),
                source_url=data.get("source_url"),
                source_type=data.get("source_type", self.source_type),
                license_type=data.get("license_type"),
            )
            self.db.add(place)
            self.stats["created"] += 1
            self.db.flush()
            return place

    def store_source_record(self, source_url: str, raw_payload: dict,
                            municipality_slug: str = None, normalized_slug: str = None,
                            external_id: str = None):
        record = SourceRecord(
            data_source_id=self.data_source.id,
            external_id=external_id,
            source_url=source_url,
            municipality_slug=municipality_slug,
            raw_payload=raw_payload,
            normalized_slug=normalized_slug,
            parse_status="parsed",
        )
        self.db.add(record)
        self.db.flush()
        return record

    @abstractmethod
    def ingest(self, municipality_slug: str = None):
        """Run the ingestion. Override in subclasses."""
        ...

    def run_full(self, municipality_slug: str = None):
        """Full ingestion lifecycle."""
        try:
            self.ensure_data_source()
            self.start_run()
            self.ingest(municipality_slug=municipality_slug)
            self.finish_run("completed")
            logger.info(
                f"[{self.source_key}] Done: "
                f"seen={self.stats['seen']} created={self.stats['created']} "
                f"updated={self.stats['updated']} failed={self.stats['failed']}"
            )
        except Exception as e:
            logger.exception(f"[{self.source_key}] Ingestion failed: {e}")
            self.finish_run("failed", notes=str(e))
            raise
