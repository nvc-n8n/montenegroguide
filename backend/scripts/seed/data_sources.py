"""Seed the data_sources table."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import DataSource

SOURCES = [
    {"source_key": "morskodobro", "name": "JP Morsko Dobro", "base_url": "https://www.morskodobro.me", "source_type": "official_government"},
    {"source_key": "hercegnovi_travel", "name": "Herceg Novi Tourism", "base_url": "https://www.hercegnovi.travel", "source_type": "official_tourism"},
    {"source_key": "kotor_travel", "name": "Kotor Tourism", "base_url": "https://kotor.travel", "source_type": "official_tourism"},
    {"source_key": "tivat_travel", "name": "Tivat Tourism", "base_url": "https://tivat.travel", "source_type": "official_tourism"},
    {"source_key": "budva_travel", "name": "Budva Tourism", "base_url": "https://budva.travel", "source_type": "official_tourism"},
    {"source_key": "bar_travel", "name": "Bar Tourism", "base_url": "https://bar.travel", "source_type": "official_tourism"},
    {"source_key": "ulcinj_travel", "name": "Ulcinj Tourism", "base_url": "https://ulcinj.travel", "source_type": "official_tourism"},
    {"source_key": "montenegro_travel", "name": "Montenegro Travel (National)", "base_url": "https://www.montenegro.travel", "source_type": "official_national"},
    {"source_key": "osm_overpass", "name": "OpenStreetMap / Overpass", "base_url": "https://overpass-api.de/api/interpreter", "source_type": "osm"},
    {"source_key": "wikidata", "name": "Wikidata", "base_url": "https://www.wikidata.org", "source_type": "knowledge_base"},
]


def seed_data_sources(db: Session):
    for src in SOURCES:
        existing = db.execute(
            select(DataSource).where(DataSource.source_key == src["source_key"])
        ).scalars().first()
        if not existing:
            db.add(DataSource(**src, active=True))
    db.commit()
    print(f"Seeded {len(SOURCES)} data sources")
