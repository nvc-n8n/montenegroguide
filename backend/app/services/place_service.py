from typing import Optional
from sqlalchemy import select, func, text, and_, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Place, PlaceImage, Municipality, Category, PlaceRelatedPlace


async def get_places(
    db: AsyncSession,
    municipality: Optional[str] = None,
    category: Optional[str] = None,
    tags: Optional[list[str]] = None,
    featured: Optional[bool] = None,
    family_friendly: Optional[bool] = None,
    hidden_gem: Optional[bool] = None,
    nightlife: Optional[bool] = None,
    active_holiday: Optional[bool] = None,
    beach_type: Optional[str] = None,
    pet_friendly: Optional[bool] = None,
    parking_available: Optional[bool] = None,
    q: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
) -> tuple[list[Place], int]:
    query = select(Place).options(
        selectinload(Place.municipality),
        selectinload(Place.category),
        selectinload(Place.images),
    )
    count_query = select(func.count(Place.id))

    conditions = []

    if municipality:
        sub = select(Municipality.id).where(Municipality.slug == municipality)
        conditions.append(Place.municipality_id.in_(sub))

    if category:
        sub = select(Category.id).where(Category.slug == category)
        conditions.append(Place.category_id.in_(sub))

    if featured is not None:
        conditions.append(Place.featured == featured)

    if family_friendly is not None:
        conditions.append(Place.family_friendly == family_friendly)

    if hidden_gem is not None:
        conditions.append(Place.hidden_gem == hidden_gem)

    if nightlife is not None:
        conditions.append(Place.nightlife == nightlife)

    if active_holiday is not None:
        conditions.append(Place.active_holiday == active_holiday)

    if beach_type is not None:
        conditions.append(Place.beach_type == beach_type)

    if pet_friendly is not None:
        conditions.append(Place.pet_friendly == pet_friendly)

    if parking_available is not None:
        conditions.append(Place.parking_available == parking_available)

    if q:
        search_cond = or_(
            Place.name.ilike(f"%{q}%"),
            Place.short_description.ilike(f"%{q}%"),
            Place.long_description.ilike(f"%{q}%"),
        )
        conditions.append(search_cond)

    if conditions:
        query = query.where(and_(*conditions))
        count_query = count_query.where(and_(*conditions))

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(desc(Place.featured), desc(Place.popularity_score), Place.name)
    query = query.offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    places = result.scalars().unique().all()
    return list(places), total


async def get_place_by_slug(db: AsyncSession, slug: str) -> Optional[Place]:
    query = (
        select(Place)
        .options(
            selectinload(Place.municipality),
            selectinload(Place.category),
            selectinload(Place.images),
            selectinload(Place.related_from).selectinload(PlaceRelatedPlace.related_place).selectinload(Place.municipality),
            selectinload(Place.related_from).selectinload(PlaceRelatedPlace.related_place).selectinload(Place.category),
            selectinload(Place.related_from).selectinload(PlaceRelatedPlace.related_place).selectinload(Place.images),
        )
        .where(Place.slug == slug)
    )
    result = await db.execute(query)
    return result.scalars().first()


async def get_featured_places(db: AsyncSession, limit: int = 20) -> list[Place]:
    query = (
        select(Place)
        .options(
            selectinload(Place.municipality),
            selectinload(Place.category),
            selectinload(Place.images),
        )
        .where(Place.featured == True)
        .order_by(desc(Place.popularity_score), Place.name)
        .limit(limit)
    )
    result = await db.execute(query)
    return list(result.scalars().unique().all())


async def search_places(db: AsyncSession, q: str, limit: int = 20) -> list[Place]:
    query = (
        select(Place)
        .options(
            selectinload(Place.municipality),
            selectinload(Place.category),
            selectinload(Place.images),
        )
        .where(
            or_(
                Place.name.ilike(f"%{q}%"),
                Place.short_description.ilike(f"%{q}%"),
            )
        )
        .order_by(desc(Place.featured), desc(Place.popularity_score))
        .limit(limit)
    )
    result = await db.execute(query)
    return list(result.scalars().unique().all())


async def get_nearby_places(
    db: AsyncSession, lat: float, lng: float, limit: int = 10, max_km: float = 50.0
) -> list[dict]:
    """Get nearby places using Haversine distance calculation."""
    all_query = (
        select(Place)
        .options(
            selectinload(Place.municipality),
            selectinload(Place.category),
            selectinload(Place.images),
        )
        .where(Place.lat.isnot(None))
        .where(Place.lng.isnot(None))
    )
    result = await db.execute(all_query)
    all_places = result.scalars().unique().all()

    import math

    def haversine(lat1, lng1, lat2, lng2):
        R = 6371
        dlat = math.radians(lat2 - lat1)
        dlng = math.radians(lng2 - lng1)
        a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    places_with_dist = []
    for p in all_places:
        dist = haversine(lat, lng, p.lat, p.lng)
        if dist <= max_km:
            img = None
            for i in p.images:
                if i.is_primary:
                    img = i
                    break
            if not img and p.images:
                img = p.images[0]

            places_with_dist.append({
                "id": p.id,
                "slug": p.slug,
                "name": p.name,
                "short_description": p.short_description,
                "municipality_slug": p.municipality.slug,
                "municipality_name": p.municipality.name,
                "category_slug": p.category.slug,
                "category_name": p.category.name,
                "lat": p.lat,
                "lng": p.lng,
                "featured": p.featured,
                "popularity_score": p.popularity_score,
                "image_url": (img.public_url or img.original_url) if img else None,
                "thumb_url": (img.thumb_public_url or img.public_url or img.original_url) if img else None,
                "distance_km": round(dist, 2),
            })

    places_with_dist.sort(key=lambda x: x["distance_km"])
    return places_with_dist[:limit]
