"""Seed the database with curated places data."""

import logging
from sqlalchemy import select
from sqlalchemy.orm import Session
from slugify import slugify

from app.models import Municipality, Category, Place
from scripts.seed.places_data import SEED_PLACES

logger = logging.getLogger(__name__)


def seed_places(db: Session, municipality_slug: str = None):
    places_to_seed = SEED_PLACES
    if municipality_slug:
        places_to_seed = [p for p in SEED_PLACES if p["municipality_slug"] == municipality_slug]

    created = 0
    updated = 0

    for data in places_to_seed:
        # Ensure municipality exists
        m = db.execute(
            select(Municipality).where(Municipality.slug == data["municipality_slug"])
        ).scalars().first()
        if not m:
            logger.warning(f"Municipality {data['municipality_slug']} not found, skipping {data['name']}")
            continue

        # Ensure category exists
        c = db.execute(
            select(Category).where(Category.slug == data["category_slug"])
        ).scalars().first()
        if not c:
            logger.warning(f"Category {data['category_slug']} not found, skipping {data['name']}")
            continue

        slug = f"{data['municipality_slug']}-{slugify(data['name'], max_length=200)}"

        existing = db.execute(
            select(Place).where(Place.slug == slug)
        ).scalars().first()

        if existing:
            # Update with seed data
            for field in [
                "lat", "lng", "short_description", "long_description",
                "tags", "amenities", "best_for", "beach_type",
                "source_url", "source_type",
            ]:
                val = data.get(field)
                if val is not None:
                    setattr(existing, field, val)
            for flag in [
                "featured", "family_friendly", "hidden_gem", "nightlife",
                "active_holiday", "cultural_site", "parking_available", "pet_friendly",
            ]:
                if flag in data:
                    setattr(existing, flag, data[flag])
            if "popularity_score" in data:
                existing.popularity_score = data["popularity_score"]
            updated += 1
        else:
            place = Place(
                slug=slug,
                name=data["name"],
                alternate_names=data.get("alternate_names", []),
                municipality_id=m.id,
                category_id=c.id,
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
                source_url=data.get("source_url"),
                source_type=data.get("source_type", "curated"),
            )
            db.add(place)
            created += 1

    db.commit()
    print(f"Seed places: created={created}, updated={updated}, total={len(places_to_seed)}")
