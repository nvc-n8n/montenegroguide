from sqlalchemy import Column, Integer, String, Text, DateTime, func

from app.db.base import Base


class IngestionRun(Base):
    __tablename__ = "ingestion_runs"

    id = Column(Integer, primary_key=True)
    source_key = Column(String(100), nullable=False, index=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    finished_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(30), nullable=False, default="running")
    records_seen = Column(Integer, default=0)
    records_created = Column(Integer, default=0)
    records_updated = Column(Integer, default=0)
    records_failed = Column(Integer, default=0)
    notes = Column(Text, nullable=True)
