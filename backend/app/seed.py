from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.base import Base
from app.models.department import Department
from app.models.user import User
from app.dependencies import engine
from app.services.auth_service import pwd_context


DEPARTMENTS = ["Compliance", "Risk", "IT", "Operations", "Audit"]

ADMIN_EMAIL = "admin@pravah.in"
ADMIN_PASSWORD = "admin123"


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    from app.dependencies import SessionLocal
    async with SessionLocal() as session:
        for dept_name in DEPARTMENTS:
            result = await session.execute(select(Department).where(Department.name == dept_name))
            if not result.scalar_one_or_none():
                session.add(Department(name=dept_name))

        # Create default admin user for development
        if settings.environment in ("development", "test"):
            result = await session.execute(select(User).where(User.email == ADMIN_EMAIL))
            if not result.scalar_one_or_none():
                admin_user = User(
                    email=ADMIN_EMAIL,
                    hashed_password=pwd_context.hash(ADMIN_PASSWORD),
                    role="compliance_officer",
                    is_active=True,
                )
                session.add(admin_user)

            # Seed demo bank accounts for demo scripts and maker-checker testing
            for demo_email, demo_role in [
                ("admin@demobank.in", "compliance_officer"),
                ("compliance@demobank.in", "compliance_officer"),
            ]:
                res = await session.execute(select(User).where(User.email == demo_email))
                if not res.scalar_one_or_none():
                    session.add(
                        User(
                            email=demo_email,
                            hashed_password=pwd_context.hash("Demobank@123"),
                            role=demo_role,
                            is_active=True,
                        )
                    )

        await session.commit()
