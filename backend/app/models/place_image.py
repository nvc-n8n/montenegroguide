from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime,
    ForeignKey, func
)
from sqlalchemy.orm import relationship

from app.db.base import Base


class PlaceImage(Base):
    __tablename__ = "place_images"

    id = Column(Integer, primary_key=True)
    place_id = Column(Integer, ForeignKey("places.id", ondelete="CASCADE"), nullable=False, index=True)

    original_url = Column(Text, nullable=True)
    storage_path = Column(Text, nullable=True)
    public_url = Column(Text, nullable=True)
    thumb_path = Column(Text, nullable=True)
    thumb_public_url = Column(Text, nullable=True)

    alt_text = Column(Text, nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(50), nullable=True)
    sha256 = Column(String(64), nullable=True, index=True)

    source_page_url = Column(Text, nullable=True)
    credit = Column(Text, nullable=True)
    license_label = Column(String(200), nullable=True)
    license_url = Column(Text, nullable=True)
    license_status = Column(String(20), nullable=False, default="needs_review")

    sort_order = Column(Integer, default=0)
    is_primary = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    place = relationship("Place", back_populates="images", foreign_keys=[place_id])
