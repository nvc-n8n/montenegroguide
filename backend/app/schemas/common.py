from pydantic import BaseModel
from typing import Optional


class PaginationParams(BaseModel):
    page: int = 1
    limit: int = 20

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.limit


class PaginatedResponse(BaseModel):
    total: int
    page: int
    limit: int
    pages: int
    items: list
