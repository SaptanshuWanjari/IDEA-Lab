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

    async def log_event(
        self,
        action: str,
        regulation_id: Optional[str] = None,
        map_id: Optional[str] = None,
        actor_id: Optional[str] = None,
        payload: Optional[dict] = None,
        correlation_id: Optional[str] = None,
        reason: Optional[str] = None,
        before: Optional[dict] = None,
        after: Optional[dict] = None,
    ) -> Optional[AuditLog]:
        """Best-effort audit write; never raises (job/version paths must not break)."""
        try:
            merged = dict(payload or {})
            if reason is not None:
                merged.setdefault("reason", reason)
            entry = AuditLog(
                regulation_id=UUID(regulation_id) if regulation_id else None,
                map_id=UUID(map_id) if map_id else None,
                actor_id=UUID(actor_id) if actor_id else None,
                action=action,
                payload=merged,
                correlation_id=correlation_id,
                before=before,
                after=after,
            )
            self.session.add(entry)
            await self.session.commit()
            try:
                await self.session.refresh(entry)
            except Exception:
                pass
            return entry
        except Exception:
            return None

    async def latest_snapshot_for_regulation(self, regulation_id: str):
        """Newest immutable snapshot covering this regulation, if any."""
        from app.models.regulation_version import RegulationVersion
        from app.services.report_snapshot import latest_snapshot

        try:
            result = await self.session.execute(
                select(RegulationVersion).where(
                    RegulationVersion.regulation_id == UUID(regulation_id)
                )
            )
            versions = list(result.scalars().all())
        except Exception:
            return None
        for version in sorted(
            versions, key=lambda v: getattr(v, "created_at", None) or "", reverse=True
        ):
            snapshot = await latest_snapshot(self.session, str(version.id))
            if snapshot is not None:
                return snapshot
        return None

    async def build_report(self, regulation_id: str, scope=None, use_snapshot: bool = True) -> dict:
        import copy

        from app.models.department import Department

        if use_snapshot:
            # Prefer the immutable snapshot when one exists so historical
            # reports are reproducible even after later MAP edits.
            try:
                snapshot = await self.latest_snapshot_for_regulation(regulation_id)
                if snapshot is not None and isinstance(snapshot.payload, dict):
                    frozen = copy.deepcopy(snapshot.payload)
                    frozen["snapshot_id"] = str(snapshot.id)
                    frozen["reproducible"] = True
                    return frozen
            except Exception:
                pass

        regulation = await self.session.get(Regulation, UUID(regulation_id))
        if not regulation:
            raise ValueError("Regulation not found")
        if scope is not None:
            from app.services.authorization import Capability, authorize

            authorize(scope, Capability.VIEW_REPORT, regulation)

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
        # Distinguish attached evidence from human-approved evidence: only
        # the latest APPROVED EvidenceAssessment counts toward completion.
        from app.services.evidence_assessment import latest_assessments_for_evidence

        all_evidence = [e for items in evidence_by_map.values() for e in items]
        latest = await latest_assessments_for_evidence(
            self.session, [e.id for e in all_evidence]
        )
        completed_count = sum(1 for m in maps if m.status == "Completed")

        def _evidence_entry(e: Evidence) -> dict:
            decision = None
            hit = latest.get(str(e.id))
            if hit is None:
                for key, value in latest.items():
                    if str(key) == str(e.id):
                        hit = value
                        break
            if hit is not None:
                decision = getattr(hit, "decision", None)
            return {
                "file_name": e.file_name,
                "uploaded_at": e.created_at.isoformat() if e.created_at else None,
                "decision": decision or getattr(e, "assessment_decision", None) or "attached",
                "approved": (decision or getattr(e, "assessment_decision", None)) == "APPROVED",
            };

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
                    "evidence": [_evidence_entry(e) for e in evidence_by_map.get(m.id, [])],
                    "evidence_attached_count": len(evidence_by_map.get(m.id, [])),
                    "evidence_approved_count": sum(
                        1 for e in evidence_by_map.get(m.id, []) if _evidence_entry(e)["approved"]
                    ),
                }
                for m in maps
            ],
            "completed_count": completed_count,
            "total_count": len(maps),
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
