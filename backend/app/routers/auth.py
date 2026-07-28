from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.dependencies import get_current_user, get_session
from app.models.user import User
from app.schemas.auth import UserCreate, UserLogin, UserOut
from app.services.auth_service import AuthService

ACCESS_TOKEN_KEY = "access_token"
REFRESH_TOKEN_KEY = "refresh_token"

router = APIRouter(prefix="/auth", tags=["auth"])


def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie(
        key=ACCESS_TOKEN_KEY,
        value=access,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
    )
    response.set_cookie(
        key=REFRESH_TOKEN_KEY,
        value=refresh,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=settings.refresh_token_expire_days * 86400,
        path="/",
    )


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(data: UserCreate, response: Response, session: AsyncSession = Depends(get_session)):
    service = AuthService(session)
    try:
        user = await service.register(data.email, data.password, data.role)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    access, refresh = service.create_tokens(user.id)
    set_auth_cookies(response, access, refresh)
    return user


@router.post("/login")
async def login(data: UserLogin, response: Response, session: AsyncSession = Depends(get_session)):
    service = AuthService(session)
    try:
        user = await service.authenticate(data.email, data.password)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    access, refresh = service.create_tokens(user.id)
    set_auth_cookies(response, access, refresh)
    return UserOut.model_validate(user)


@router.post("/refresh")
async def refresh(request: Request, response: Response, session: AsyncSession = Depends(get_session)):
    refresh_token = request.cookies.get(REFRESH_TOKEN_KEY)
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")
    service = AuthService(session)
    try:
        user_id = service.decode_token(refresh_token, "refresh")
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    access, refresh = service.create_tokens(user.id)
    set_auth_cookies(response, access, refresh)
    return UserOut.model_validate(user)


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(ACCESS_TOKEN_KEY, path="/")
    response.delete_cookie(REFRESH_TOKEN_KEY, path="/")
    return {"status": "ok"}


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return UserOut.model_validate(user)
