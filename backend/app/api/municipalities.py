from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services import municipality_service

router = APIRouter(prefix="/api/v1", tags=["municipalities"])


@router.get("/municipalities")
async def list_municipalities(db: AsyncSession = Depends(get_db)):
    return await municipality_service.get_all_municipalities(db)


@router.get("/municipalities/{slug}/overview")
async def municipality_overview(slug: str, db: AsyncSession = Depends(get_db)):
    result = await municipality_service.get_municipality_overview(db, slug)
    if not result:
        raise HTTPException(status_code=404, detail="Municipality not found")
    return result
