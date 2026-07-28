import asyncio
import os
import sys
from pathlib import Path

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.models.base import Base

# ponytail: make repo-root `scripts` importable from backend/tests
REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

# Default to Supabase for tests; override via TEST_DATABASE_URL env var.
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://postgres:Saptanshu%4012@db.daubulisecwfolulknrd.supabase.co:5432/postgres",
)

engine = create_async_engine(TEST_DATABASE_URL)
AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


def _db_unreachable() -> bool:
    import warnings

    with warnings.catch_warnings():
        warnings.simplefilter("ignore", RuntimeWarning)
        try:
            asyncio.run(_ping_db())
            return False
        except Exception:
            return True


async def _ping_db():
    async with engine.connect() as _:
        pass


@pytest_asyncio.fixture(scope="session")
async def setup_db():
    if _db_unreachable():
        pytest.skip("Database is unreachable")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def session(setup_db):
    async with AsyncSessionLocal() as s:
        yield s
