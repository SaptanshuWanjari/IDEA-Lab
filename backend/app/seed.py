from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import Base
from app.models.department import Department
from app.models.user import User
from app.dependencies import engine


DEPARTMENTS = ["Compliance", "Risk", "IT", "Operations", "Audit"]


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    from app.dependencies import SessionLocal
    async with SessionLocal() as session:
        for dept_name in DEPARTMENTS:
            result = await session.execute(select(Department).where(Department.name == dept_name))
            if not result.scalar_one_or_none():
                session.add(Department(name=dept_name))
        await session.commit()
