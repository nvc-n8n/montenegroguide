from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models import Category, Place, PlaceImage

router = APIRouter(prefix="/api/v1", tags=["categories"])


@router.get("/categories")
async def list_categories(db: AsyncSession = Depends(get_db)):
    # Get category counts
    count_query = (
        select(
            Category.id,
            Category.slug,
            Category.name,
            Category.icon,
            func.count(Place.id).label("place_count"),
        )
        .outerjoin(Place, Place.category_id == Category.id)
        .group_by(Category.id)
        .order_by(Category.name)
    )
    count_result = await db.execute(count_query)
    rows = count_result.fetchall()

    # Get one cover image per category (highest popularity place with an image)
    cover_query = (
        select(Place.category_id, PlaceImage.public_url, PlaceImage.thumb_public_url, PlaceImage.original_url)
        .join(PlaceImage, PlaceImage.place_id == Place.id)
        .where(PlaceImage.is_primary == True)
        .order_by(Place.category_id, Place.popularity_score.desc())
        .distinct(Place.category_id)
    )
    # SQLite doesn't support DISTINCT ON, so use a subquery approach
    from sqlalchemy import text
    cover_result = await db.execute(text("""
        SELECT p.category_id, pi.public_url, pi.thumb_public_url, pi.original_url
        FROM places p
        JOIN place_images pi ON pi.place_id = p.id AND pi.is_primary = 1
        WHERE pi.public_url IS NOT NULL AND pi.public_url != ''
        GROUP BY p.category_id
        HAVING p.popularity_score = MAX(p.popularity_score)
        ORDER BY p.category_id
    """))
    cover_rows = {r[0]: r for r in cover_result.fetchall()}

    # Get real counts for flag-based categories (hidden_gem, family_friendly)
    flag_counts = {}
    flag_result = await db.execute(text(
        "SELECT COUNT(*) FROM places WHERE hidden_gem = 1"
    ))
    flag_counts["hidden-gems"] = flag_result.scalar() or 0
    flag_result = await db.execute(text(
        "SELECT COUNT(*) FROM places WHERE family_friendly = 1"
    ))
    flag_counts["porodicna-mjesta"] = flag_result.scalar() or 0

    results = []
    for r in rows:
        cover = cover_rows.get(r.id)
        cover_url = None
        cover_thumb = None
        if cover:
            cover_url = cover[1] or cover[3]  # public_url or original_url
            cover_thumb = cover[2] or cover[1] or cover[3]  # thumb or public or original

        # Use flag-based count if this is a virtual category
        place_count = flag_counts.get(r.slug, r.place_count)

        results.append({
            "id": r.id,
            "slug": r.slug,
            "name": r.name,
            "icon": r.icon,
            "place_count": place_count,
            "cover_image_url": cover_url,
            "cover_thumb_url": cover_thumb,
        })

    return results
