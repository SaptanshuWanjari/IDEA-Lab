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
        from app.models.department import Department

        regulation = await self.session.get(Regulation, UUID(regulation_id))
        if not regulation:
            raise ValueError("Regulation not found")

        result = await self.session.execute(
            select(MAP, Department.name.label("department_name"))
            .outerjoin(Department, MAP.owner_department_id == Department.id)
            .where(MAP.regulation_id == UUID(regulation_id))
        )
        rows = result.all()
        maps = [row.MAP for row in rows]
        dept_names = {row.MAP.id: row.department_name for row in rows}
        map_ids = [m.id for m in maps]
        ev_result = await self.session.execute(select(Evidence).where(Evidence.map_id.in_(map_ids)))
        evidence_by_map: dict[UUID, list[Evidence]] = {}
        for e in ev_result.scalars().all():
            evidence_by_map.setdefault(e.map_id, []).append(e)
        completed_count = sum(1 for m in maps if m.status == "Completed")

        return {
            "regulation_id": str(regulation.id),
            "title": regulation.title,
            "status": regulation.status,
            "summary": regulation.summary,
            "effective_date": str(regulation.effective_date) if regulation.effective_date else None,
            "maps": [
                {
                    "id": str(m.id),
                    "description": m.description,
                    "status": m.status,
                    "department": dept_names.get(m.id) or str(m.owner_department_id),
                    "confidence": m.confidence,
                    "source_clauses": m.source_clauses or [],
                    "reasoning": m.reasoning,
                    "evidence": [
                        {
                            "file_name": e.file_name,
                            "uploaded_at": e.created_at.isoformat() if e.created_at else None,
                        }
                        for e in evidence_by_map.get(m.id, [])
                    ],
                }
                for m in maps
            ],
            "completed_count": completed_count,
            "total_count": len(maps),
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
