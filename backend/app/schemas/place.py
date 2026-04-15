from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PlaceImageResponse(BaseModel):
    id: int
    public_url: Optional[str] = None
    thumb_public_url: Optional[str] = None
    alt_text: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    credit: Optional[str] = None
    license_label: Optional[str] = None
    is_primary: bool = False

    class Config:
        from_attributes = True


class PlaceListItem(BaseModel):
    id: int
    slug: str
    name: str
    municipality_slug: str
    municipality_name: str
    category_slug: str
    category_name: str
    short_description: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    tags: list[str] = []
    featured: bool = False
    popularity_score: int = 0
    family_friendly: bool = False
    hidden_gem: bool = False
    beach_type: Optional[str] = None
    amenities: list[str] = []
    best_for: list[str] = []
    nightlife: bool = False
    active_holiday: bool = False
    cultural_site: bool = False
    pet_friendly: bool = False
    parking_available: bool = False
    subtype: Optional[str] = None
    image_url: Optional[str] = None
    thumb_url: Optional[str] = None

    class Config:
        from_attributes = True


class PlaceDetail(BaseModel):
    id: int
    slug: str
    name: str
    alternate_names: list[str] = []
    municipality_slug: str
    municipality_name: str
    category_slug: str
    category_name: str
    subtype: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    short_description: Optional[str] = None
    long_description: Optional[str] = None
    tags: list[str] = []
    amenities: list[str] = []
    best_for: list[str] = []
    featured: bool = False
    popularity_score: int = 0
    family_friendly: bool = False
    hidden_gem: bool = False
    nightlife: bool = False
    active_holiday: bool = False
    cultural_site: bool = False
    beach_type: Optional[str] = None
    parking_available: bool = False
    pet_friendly: bool = False
    accessibility_notes: Optional[str] = None
    source_url: Optional[str] = None
    images: list[PlaceImageResponse] = []
    related_places: list["PlaceListItem"] = []

    class Config:
        from_attributes = True


class PlaceSearchResult(BaseModel):
    id: int
    slug: str
    name: str
    municipality_slug: str
    category_slug: str
    short_description: Optional[str] = None
    thumb_url: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

    class Config:
        from_attributes = True


class NearbyPlace(PlaceSearchResult):
    distance_km: float

    class Config:
        from_attributes = True
