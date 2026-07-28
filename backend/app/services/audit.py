from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog
from app.models.evidence import Evidence
from app.models.map import MAP
from app.models.regulation import Regulation


class AuditService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def log(
        self,
        action: str,
        regulation_id: Optional[str] = None,
        map_id: Optional[str] = None,
        actor_id: Optional[str] = None,
        payload: Optional[dict] = None,
    ) -> AuditLog:
        entry = AuditLog(
            regulation_id=UUID(regulation_id) if regulation_id else None,
            map_id=UUID(map_id) if map_id else None,
            actor_id=UUID(actor_id) if actor_id else None,
            action=action,
            payload=payload,
        )
        self.session.add(entry)
        await self.session.commit()
        await self.session.refresh(entry)
        return entry

    async def build_report(self, regulation_id: str) -> dict:
        regulation = await self.session.get(Regulation, UUID(regulation_id))
        result = await self.session.execute(select(MAP).where(MAP.regulation_id == UUID(regulation_id)))
        maps = result.scalars().all()
        map_ids = [m.id for m in maps]
        ev_result = await self.session.execute(select(Evidence).where(Evidence.map_id.in_(map_ids)))
        evidence = ev_result.scalars().all()
        completed_count = sum(1 for m in maps if m.status == "Completed")
        return {
            "regulation": {
                "id": str(regulation.id),
                "title": regulation.title,
                "status": regulation.status,
            } if regulation else None,
            "maps": [
                {
                    "id": str(m.id),
                    "description": m.description,
                    "status": m.status,
                    "approval_state": m.approval_state,
                }
                for m in maps
            ],
            "evidence": [
                {
                    "id": str(e.id),
                    "map_id": str(e.map_id),
                    "file_name": e.file_name,
                    "uploaded_by": str(e.uploaded_by),
                }
                for e in evidence
            ],
            "completed_count": completed_count,
            "total_count": len(maps),
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
