from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from app.db.base import Base


class PlaceRelatedPlace(Base):
    __tablename__ = "place_related_places"

    id = Column(Integer, primary_key=True)
    place_id = Column(Integer, ForeignKey("places.id", ondelete="CASCADE"), nullable=False, index=True)
    related_place_id = Column(Integer, ForeignKey("places.id", ondelete="CASCADE"), nullable=False, index=True)
    relation_type = Column(String(50), nullable=False, default="nearby")

    place = relationship("Place", foreign_keys=[place_id], back_populates="related_from")
    related_place = relationship("Place", foreign_keys=[related_place_id])
