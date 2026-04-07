from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Float, DateTime,
    ForeignKey, Index, func
)
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR
from sqlalchemy.orm import relationship

from app.db.base import Base


class Place(Base):
    __tablename__ = "places"

    id = Column(Integer, primary_key=True)
    slug = Column(String(300), unique=True, nullable=False, index=True)
    name = Column(String(300), nullable=False)
    alternate_names = Column(JSONB, default=list)
    municipality_id = Column(Integer, ForeignKey("municipalities.id"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False, index=True)
    subtype = Column(String(100), nullable=True)

    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)

    short_description = Column(Text, nullable=True)
    long_description = Column(Text, nullable=True)

    tags = Column(JSONB, default=list)
    amenities = Column(JSONB, default=list)
    best_for = Column(JSONB, default=list)

    featured = Column(Boolean, default=False, index=True)
    popularity_score = Column(Integer, default=0)
    family_friendly = Column(Boolean, default=False)
    hidden_gem = Column(Boolean, default=False)
    nightlife = Column(Boolean, default=False)
    active_holiday = Column(Boolean, default=False)
    cultural_site = Column(Boolean, default=False)
    beach_type = Column(String(50), nullable=True)
    parking_available = Column(Boolean, default=False)
    pet_friendly = Column(Boolean, default=False)
    accessibility_notes = Column(Text, nullable=True)

    source_url = Column(Text, nullable=True)
    source_type = Column(String(50), nullable=True)
    license_type = Column(String(100), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)

    search_document = Column(TSVECTOR, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    municipality = relationship("Municipality", back_populates="places", lazy="selectin")
    category = relationship("Category", back_populates="places", lazy="selectin")
    images = relationship("PlaceImage", back_populates="place", lazy="selectin", order_by="PlaceImage.sort_order")
    related_from = relationship(
        "PlaceRelatedPlace",
        foreign_keys="PlaceRelatedPlace.place_id",
        back_populates="place",
        lazy="selectin",
    )

    __table_args__ = (
        Index("ix_places_municipality_category", "municipality_id", "category_id"),
        Index("ix_places_featured_popularity", "featured", "popularity_score"),
        Index(
            "ix_places_search_document",
            "search_document",
            postgresql_using="gin",
        ),
        Index(
            "ix_places_name_trgm",
            "name",
            postgresql_using="gin",
            postgresql_ops={"name": "gin_trgm_ops"},
        ),
    )
