"""Provisioned-role service for the single-bank pilot.

Public registration is closed in pilot/production (see POST /auth/register
gating); users enter via bank-admin invitation and hold scoped
RoleAssignment rows. Password login is retained for the local demo; OIDC
is intentionally a stub — ProvisioningService.resolve_oidc_claims is the
documented adapter entry point that a future OIDC login flow should call
to resolve an already-provisioned user from verified claims.
"""

import secrets
import uuid
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select

from app.models.audit import AuditLog
from app.models.role import RoleAssignment, RoleCode
from app.models.user import User
from app.services.auth_service import pwd_context


class AuthorizationError(Exception):
    """Raised when the acting user lacks the required provisioned role."""


_VALID_ROLES = {r.value for r in RoleCode}


def _coerce_roles(roles) -> list[str]:
    codes = [r.value if isinstance(r, RoleCode) else str(r) for r in roles]
    unknown = [c for c in codes if c not in _VALID_ROLES]
    if unknown:
        raise ValueError(f"Unknown role(s): {unknown}")
    return codes


class ProvisioningService:
    def __init__(self, session):
        self.session = session

    async def _actor_role_codes(self, actor_id: UUID, bank_id: str | None = None) -> set[str]:
        result = await self.session.execute(
            select(RoleAssignment).where(RoleAssignment.user_id == actor_id)
        )
        rows = result.scalars().all()
        now = datetime.now(timezone.utc)
        codes = set()
        for row in rows:
            until = getattr(row, "effective_until", None)
            if until is not None:
                if until.tzinfo is None:
                    until = until.replace(tzinfo=timezone.utc)
                if until <= now:
                    continue
            if bank_id is not None and getattr(row, "bank_id", None) not in (None, bank_id):
                continue
            codes.add(getattr(row, "role_code"))
        return codes

    async def _require_bank_admin(self, actor_id: UUID, bank_id: str | None = None) -> None:
        codes = await self._actor_role_codes(actor_id, bank_id)
        if RoleCode.BANK_ADMIN.value not in codes:
            raise AuthorizationError("bank_admin role required")

    async def assign_roles(
        self,
        user_id: UUID,
        roles,
        actor_id: UUID,
        bank_id: str | None = None,
    ) -> list[RoleAssignment]:
        """Grant roles to a user. Only a bank_admin may grant."""
        await self._require_bank_admin(actor_id, bank_id)
        codes = _coerce_roles(roles)
        now = datetime.now(timezone.utc)
        rows = [
            RoleAssignment(
                user_id=user_id,
                bank_id=bank_id,
                role_code=code,
                granted_by=actor_id,
                effective_from=now,
            )
            for code in codes
        ]
        for row in rows:
            self.session.add(row)
        self.session.add(
            AuditLog(
                actor_id=actor_id,
                action="roles.assigned",
                payload={"user_id": str(user_id), "roles": codes, "bank_id": bank_id},
            )
        )
        await self.session.commit()
        return rows

    async def invite(
        self,
        email: str,
        bank_id: str,
        roles,
        actor_id: UUID,
    ) -> tuple[User, list[RoleAssignment]]:
        """Provision a user (creating the account if needed) and grant roles.

        Only a bank_admin may invite.
        """
        await self._require_bank_admin(actor_id, bank_id)
        codes = _coerce_roles(roles)
        result = await self.session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user is None:
            user = User(
                email=email,
                hashed_password=pwd_context.hash(secrets.token_urlsafe(32)),
                role="viewer",
            )
            self.session.add(user)
            await self.session.commit()
            try:
                await self.session.refresh(user)
            except Exception:
                if getattr(user, "id", None) is None:
                    user.id = uuid.uuid4()
        rows = await self.assign_roles(user.id, codes, actor_id=actor_id, bank_id=bank_id)
        return user, rows

    async def resolve_oidc_claims(self, claims: dict) -> User | None:
        """OIDC adapter entry point (stub).

        A future OIDC login flow should verify the token upstream, then call
        this with the verified claims to resolve the already-provisioned
        user. Returns the matching User or None. It deliberately does NOT
        auto-provision: users must be invited by a bank_admin first.
        """
        email = (claims or {}).get("email")
        if not email:
            return None
        result = await self.session.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()
