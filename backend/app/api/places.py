import math
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services import place_service

router = APIRouter(prefix="/api/v1", tags=["places"])


def _primary_image(place):
    for img in place.images:
        if img.is_primary:
            return img
    return place.images[0] if place.images else None


def _img_url(img):
    """Get best available image URL, falling back to original_url."""
    if not img:
        return None
    return img.public_url or img.original_url


def _thumb_url(img):
    """Get best available thumbnail URL."""
    if not img:
        return None
    return img.thumb_public_url or img.public_url or img.original_url


def _place_list_item(p):
    img = _primary_image(p)
    return {
        "id": p.id,
        "slug": p.slug,
        "name": p.name,
        "municipality_slug": p.municipality.slug,
        "municipality_name": p.municipality.name,
        "category_slug": p.category.slug,
        "category_name": p.category.name,
        "short_description": p.short_description,
        "lat": p.lat,
        "lng": p.lng,
        "tags": p.tags or [],
        "featured": p.featured,
        "popularity_score": p.popularity_score,
        "family_friendly": p.family_friendly,
        "hidden_gem": p.hidden_gem,
        "beach_type": p.beach_type,
        "amenities": p.amenities or [],
        "best_for": p.best_for or [],
        "nightlife": p.nightlife,
        "active_holiday": p.active_holiday,
        "cultural_site": p.cultural_site,
        "pet_friendly": p.pet_friendly,
        "parking_available": p.parking_available,
        "subtype": p.subtype,
        "image_url": _img_url(img),
        "thumb_url": _thumb_url(img),
    }


@router.get("/places")
async def list_places(
    municipality: Optional[str] = None,
    category: Optional[str] = None,
    tags: Optional[list[str]] = Query(None),
    featured: Optional[bool] = None,
    family_friendly: Optional[bool] = None,
    hidden_gem: Optional[bool] = None,
    nightlife: Optional[bool] = None,
    active_holiday: Optional[bool] = None,
    beach_type: Optional[str] = None,
    pet_friendly: Optional[bool] = None,
    parking_available: Optional[bool] = None,
    q: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    places, total = await place_service.get_places(
        db,
        municipality=municipality,
        category=category,
        tags=tags,
        featured=featured,
        family_friendly=family_friendly,
        hidden_gem=hidden_gem,
        nightlife=nightlife,
        active_holiday=active_holiday,
        beach_type=beach_type,
        pet_friendly=pet_friendly,
        parking_available=parking_available,
        q=q,
        page=page,
        limit=limit,
    )
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "pages": math.ceil(total / limit) if limit else 0,
        "items": [_place_list_item(p) for p in places],
    }


@router.get("/places/{slug}")
async def get_place(slug: str, db: AsyncSession = Depends(get_db)):
    place = await place_service.get_place_by_slug(db, slug)
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")

    related = []
    if place.related_from:
        for rel in place.related_from:
            rp = rel.related_place
            if rp:
                rp_img = _primary_image(rp) if rp.images else None
                related.append({
                    "id": rp.id,
                    "slug": rp.slug,
                    "name": rp.name,
                    "municipality_slug": rp.municipality.slug if rp.municipality else None,
                    "municipality_name": rp.municipality.name if rp.municipality else None,
                    "category_slug": rp.category.slug if rp.category else None,
                    "category_name": rp.category.name if rp.category else None,
                    "short_description": rp.short_description,
                    "lat": rp.lat,
                    "lng": rp.lng,
                    "image_url": _img_url(rp_img),
                    "thumb_url": _thumb_url(rp_img),
                })

    return {
        "id": place.id,
        "slug": place.slug,
        "name": place.name,
        "alternate_names": place.alternate_names or [],
        "municipality_slug": place.municipality.slug,
        "municipality_name": place.municipality.name,
        "category_slug": place.category.slug,
        "category_name": place.category.name,
        "subtype": place.subtype,
        "lat": place.lat,
        "lng": place.lng,
        "short_description": place.short_description,
        "long_description": place.long_description,
        "tags": place.tags or [],
        "amenities": place.amenities or [],
        "best_for": place.best_for or [],
        "featured": place.featured,
        "popularity_score": place.popularity_score,
        "family_friendly": place.family_friendly,
        "hidden_gem": place.hidden_gem,
        "nightlife": place.nightlife,
        "active_holiday": place.active_holiday,
        "cultural_site": place.cultural_site,
        "beach_type": place.beach_type,
        "parking_available": place.parking_available,
        "pet_friendly": place.pet_friendly,
        "accessibility_notes": place.accessibility_notes,
        "source_url": place.source_url,
        "images": [
            {
                "id": img.id,
                "public_url": img.public_url or img.original_url,
                "thumb_public_url": img.thumb_public_url or img.public_url or img.original_url,
                "alt_text": img.alt_text,
                "width": img.width,
                "height": img.height,
                "credit": img.credit,
                "license_label": img.license_label,
                "is_primary": img.is_primary,
            }
            for img in (place.images or [])
        ],
        "related_places": related,
    }


@router.get("/featured")
async def featured_places(
    limit: int = Query(24, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Return structured featured content matching frontend expectations."""
    places = await place_service.get_featured_places(db, limit=limit)
    items = [_place_list_item(p) for p in places]

    # Get first municipality for the hero
    from app.services import municipality_service
    municipalities = await municipality_service.get_all_municipalities(db)
    featured_muni = municipalities[0] if municipalities else None

    beaches = [p for p in items if p.get("category_slug") == "plaze"]
    attractions = [p for p in items if p.get("category_slug") in (
        "znamenitosti", "tvrdjave-stari-gradovi", "muzeji-kultura", "manastiri-crkve"
    )]
    taste_and_nightlife = [p for p in items if p.get("category_slug") in (
        "restorani-beach-barovi", "nocni-zivot"
    )]
    active_escapes = [p for p in items if p.get("category_slug") in (
        "aktivni-odmor", "priroda-vidikovci"
    )]

    return {
        "featured_municipality": featured_muni,
        "beaches": beaches[:6],
        "attractions": attractions[:6],
        "taste_and_nightlife": taste_and_nightlife[:6],
        "active_escapes": active_escapes[:6],
    }


@router.get("/search")
async def search(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    places = await place_service.search_places(db, q=q, limit=limit)
    results = []
    for p in places:
        img = _primary_image(p)
        results.append({
            "id": p.id,
            "slug": p.slug,
            "name": p.name,
            "municipality_slug": p.municipality.slug,
            "municipality_name": p.municipality.name,
            "category_slug": p.category.slug,
            "category_name": p.category.name,
            "short_description": p.short_description,
            "image_url": _img_url(img),
            "thumb_url": _thumb_url(img),
            "lat": p.lat,
            "lng": p.lng,
        })
    return results


@router.get("/nearby")
async def nearby(
    lat: float = Query(...),
    lng: float = Query(...),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    return await place_service.get_nearby_places(db, lat=lat, lng=lng, limit=limit)
