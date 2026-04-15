"""Initialize the database - creates all tables directly from models.
Works with both SQLite and PostgreSQL.
"""
from app.db.base import Base
from app.db.session import sync_engine
from app.models import *  # noqa: F401,F403


def init_db():
    """Create all tables."""
    Base.metadata.create_all(bind=sync_engine)
    print("Database tables created successfully.")


def drop_db():
    """Drop all tables."""
    Base.metadata.drop_all(bind=sync_engine)
    print("Database tables dropped.")


if __name__ == "__main__":
    init_db()
