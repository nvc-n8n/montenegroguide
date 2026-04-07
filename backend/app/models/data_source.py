from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from sqlalchemy.orm import relationship

from app.db.base import Base


class DataSource(Base):
    __tablename__ = "data_sources"

    id = Column(Integer, primary_key=True)
    source_key = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    base_url = Column(String(500), nullable=True)
    source_type = Column(String(50), nullable=False)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    records = relationship("SourceRecord", back_populates="data_source", lazy="selectin")
