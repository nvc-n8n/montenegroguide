from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship

from app.db.base import Base


class Municipality(Base):
    __tablename__ = "municipalities"

    id = Column(Integer, primary_key=True)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    region = Column(String(100), default="coast")
    short_description = Column(Text, nullable=True)
    hero_image_id = Column(Integer, ForeignKey("place_images.id", use_alter=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    places = relationship("Place", back_populates="municipality", lazy="selectin")
    hero_image = relationship("PlaceImage", foreign_keys=[hero_image_id], lazy="selectin")
