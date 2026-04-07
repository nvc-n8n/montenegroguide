from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.config import settings

async_engine = create_async_engine(settings.database_url, echo=False, pool_size=10, max_overflow=20)
async_session_factory = async_sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)

sync_engine = create_engine(settings.database_url_sync, echo=False, pool_size=5)
sync_session_factory = sessionmaker(sync_engine, class_=Session, expire_on_commit=False)


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
