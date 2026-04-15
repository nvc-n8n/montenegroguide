from typing import Optional
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Municipality, Place, Category, PlaceImage


async def get_all_municipalities(db: AsyncSession) -> list[dict]:
    query = select(Municipality).order_by(Municipality.name)
    result = await db.execute(query)
    municipalities = result.scalars().all()

    items = []
    for m in municipalities:
        count_q = select(func.count(Place.id)).where(Place.municipality_id == m.id)
        count_r = await db.execute(count_q)
        count = count_r.scalar() or 0

        hero_url = None
        if m.hero_image_id:
            img_q = select(PlaceImage).where(PlaceImage.id == m.hero_image_id)
            img_r = await db.execute(img_q)
            img = img_r.scalars().first()
            hero_url = (img.public_url or img.original_url) if img else None

        items.append({
            "id": m.id,
            "slug": m.slug,
            "name": m.name,
            "region": m.region,
            "short_description": m.short_description,
            "hero_image_url": hero_url,
            "place_count": count,
        })
    return items


async def get_municipality_overview(db: AsyncSession, slug: str) -> Optional[dict]:
    query = select(Municipality).where(Municipality.slug == slug)
    result = await db.execute(query)
    m = result.scalars().first()
    if not m:
        return None

    # Category counts
    cat_q = (
        select(Category.slug, Category.name, func.count(Place.id).label("count"))
        .join(Place, Place.category_id == Category.id)
        .where(Place.municipality_id == m.id)
        .group_by(Category.id)
        .order_by(desc("count"))
    )
    cat_r = await db.execute(cat_q)
    categories = [{"slug": r.slug, "name": r.name, "count": r.count} for r in cat_r.fetchall()]

    # Featured places
    feat_q = (
        select(Place)
        .options(selectinload(Place.category), selectinload(Place.images))
        .where(Place.municipality_id == m.id, Place.featured == True)
        .order_by(desc(Place.popularity_score))
        .limit(10)
    )
    feat_r = await db.execute(feat_q)
    featured = feat_r.scalars().unique().all()

    count_q = select(func.count(Place.id)).where(Place.municipality_id == m.id)
    count_r = await db.execute(count_q)
    place_count = count_r.scalar() or 0

    hero_url = None
    if m.hero_image_id:
        img_q = select(PlaceImage).where(PlaceImage.id == m.hero_image_id)
        img_r = await db.execute(img_q)
        img = img_r.scalars().first()
        hero_url = (img.public_url or img.original_url) if img else None

    def _primary_image(place):
        for img in place.images:
            if img.is_primary:
                return img
        return place.images[0] if place.images else None

    def _build_featured(p):
        img = _primary_image(p)
        return {
            "id": p.id,
            "slug": p.slug,
            "name": p.name,
            "short_description": p.short_description,
            "municipality_slug": m.slug,
            "municipality_name": m.name,
            "category_slug": p.category.slug,
            "category_name": p.category.name,
            "image_url": (img.public_url or img.original_url) if img else None,
            "thumb_url": (img.thumb_public_url or img.public_url or img.original_url) if img else None,
            "lat": p.lat,
            "lng": p.lng,
            "featured": p.featured,
            "popularity_score": p.popularity_score,
        }

    return {
        "id": m.id,
        "slug": m.slug,
        "name": m.name,
        "region": m.region,
        "short_description": m.short_description,
        "hero_image_url": hero_url,
        "place_count": place_count,
        "categories": categories,
        "featured_places": [_build_featured(p) for p in featured],
    }
