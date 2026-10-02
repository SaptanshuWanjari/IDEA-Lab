from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
import app.models  # noqa: F401 — ensure all mappers are registered
from app.models.user import User
from app.services.auth_service import AuthService
from app.services.authorization import LEGACY_BANK_ID, LEGACY_ENTITY_ID, RequestScope

engine = create_async_engine(settings.database_url)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncSession:
    async with SessionLocal() as session:
        yield session


async def get_current_user(request: Request, session: AsyncSession = Depends(get_session)) -> User:
    auth_service = AuthService(session)
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        user_id = auth_service.decode_token(token, "access")
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token")
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_role(*roles: str):
    async def checker(user: User = Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return checker


async def get_request_scope(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> RequestScope:
    """Build the caller's RequestScope from provisioned roles + memberships.

    Falls back to the single-bank legacy scope (Legacy Demo Bank/Entity)
    when the user has no assignments, keeping existing dev data working.
    """
    from app.models.membership import DepartmentMembership
    from app.models.role import RoleAssignment

    bank_id = LEGACY_BANK_ID
    legal_entity_ids = [LEGACY_ENTITY_ID]
    role_codes: list[str] = []
    department_ids: list[str] = []
    try:
        result = await session.execute(
            select(RoleAssignment).where(RoleAssignment.user_id == user.id)
        )
        rows = result.scalars().all()
        if rows:
            banks = {getattr(r, "bank_id", None) for r in rows}
            banks.discard(None)
            if banks:
                bank_id = sorted(banks)[0]
            role_codes = [getattr(r, "role_code") for r in rows]
        mem_result = await session.execute(
            select(DepartmentMembership).where(DepartmentMembership.user_id == user.id)
        )
        mem_rows = mem_result.scalars().all()
        if mem_rows:
            entities = {getattr(m, "legal_entity_id", None) for m in mem_rows}
            entities.discard(None)
            if entities:
                legal_entity_ids = sorted(entities)
            department_ids = [str(getattr(m, "department_id")) for m in mem_rows]
    except Exception:
        pass
    return RequestScope(
        user_id=str(user.id),
        bank_id=bank_id,
        legal_entity_ids=legal_entity_ids,
        department_ids=department_ids,
        role_codes=role_codes,
    )
