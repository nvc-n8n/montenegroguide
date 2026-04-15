from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func, JSON
from sqlalchemy.orm import relationship

from app.db.base import Base


class SourceRecord(Base):
    __tablename__ = "source_records"

    id = Column(Integer, primary_key=True)
    data_source_id = Column(Integer, ForeignKey("data_sources.id"), nullable=False, index=True)
    external_id = Column(String(300), nullable=True)
    source_url = Column(Text, nullable=False)
    municipality_slug = Column(String(100), nullable=True, index=True)
    raw_payload = Column(JSON, nullable=True)
    normalized_slug = Column(String(300), nullable=True, index=True)
    parse_status = Column(String(30), nullable=False, default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    data_source = relationship("DataSource", back_populates="records")
