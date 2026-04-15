from pydantic import BaseModel
from typing import Optional


class CategoryBase(BaseModel):
    slug: str
    name: str
    icon: Optional[str] = None


class CategoryResponse(CategoryBase):
    id: int
    place_count: int = 0

    class Config:
        from_attributes = True
