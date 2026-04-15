from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session

from app.config import settings

# For SQLite, enable WAL mode and foreign keys
connect_args = {}
if settings.is_sqlite:
    connect_args = {"check_same_thread": False}

async_engine = create_async_engine(settings.database_url, echo=False, connect_args=connect_args)
async_session_factory = async_sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)

sync_engine = create_engine(settings.database_url_sync, echo=False, connect_args=connect_args)
sync_session_factory = sessionmaker(sync_engine, class_=Session, expire_on_commit=False)


# Enable foreign keys for SQLite
if settings.is_sqlite:
    @event.listens_for(sync_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()


async def get_db() -> AsyncSession:
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()


def get_sync_db() -> Session:
    session = sync_session_factory()
    try:
        yield session
    finally:
        session.close()
