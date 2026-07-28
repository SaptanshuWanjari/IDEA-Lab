from datetime import datetime, timedelta, timezone
from uuid import UUID

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def register(self, email: str, password: str, role: str = "department_manager") -> User:
        result = await self.session.execute(select(User).where(User.email == email))
        if result.scalar_one_or_none():
            raise ValueError("Email already registered")
        user = User(email=email, hashed_password=pwd_context.hash(password), role=role)
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def authenticate(self, email: str, password: str) -> User:
        result = await self.session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user or not pwd_context.verify(password, user.hashed_password):
            raise ValueError("Invalid credentials")
        return user

    def create_tokens(self, user_id: UUID) -> tuple[str, str]:
        access_payload = {
            "sub": str(user_id),
            "type": "access",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes),
        }
        refresh_payload = {
            "sub": str(user_id),
            "type": "refresh",
            "exp": datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
        }
        access = jwt.encode(access_payload, settings.secret_key, algorithm=settings.algorithm)
        refresh = jwt.encode(refresh_payload, settings.secret_key, algorithm=settings.algorithm)
        return access, refresh

    def decode_token(self, token: str, token_type: str = "access") -> UUID:
        try:
            payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
            if payload.get("type") != token_type:
                raise ValueError("Invalid token type")
            return UUID(payload["sub"])
        except JWTError as e:
            raise ValueError("Invalid token") from e
