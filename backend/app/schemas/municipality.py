from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class MunicipalityBase(BaseModel):
    slug: str
    name: str
    region: str = "coast"
    short_description: Optional[str] = None


class MunicipalityResponse(MunicipalityBase):
    id: int
    hero_image_url: Optional[str] = None
    place_count: int = 0

    class Config:
        from_attributes = True


class MunicipalityOverview(MunicipalityResponse):
    categories: list["CategoryCount"] = []
    featured_places: list["PlaceCompact"] = []


class CategoryCount(BaseModel):
    slug: str
    name: str
    count: int


class PlaceCompact(BaseModel):
    id: int
    slug: str
    name: str
    short_description: Optional[str] = None
    category_slug: str
    category_name: str
    image_url: Optional[str] = None
    thumb_url: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    featured: bool = False
    popularity_score: int = 0

    class Config:
        from_attributes = True
