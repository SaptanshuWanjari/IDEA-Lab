"""Task 10: immutable report snapshots.

``build_report_snapshot`` deep-copies the current regulation-version, plan,
obligation, MAP, evidence and assessment state into a :class:`ReportSnapshot`
payload together with a data cutoff and SHA-256 artifact hashes. Later edits
to live rows cannot change the stored payload, so historical reports are
reproducible.
"""

import copy
import hashlib
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select

from app.models.ai_run import ReportSnapshot
from app.models.evidence import Evidence
from app.models.evidence_assessment import EvidenceAssessment
from app.models.map import MAP
from app.models.map_plan import MAPPlan, MAPPlanItem
from app.models.obligation import Obligation


def _utcnow():
    return datetime.now(timezone.utc)


def _sha256(*parts: object) -> str:
    digest = hashlib.sha256()
    for part in parts:
        digest.update(str(part if part is not None else "").encode("utf-8"))
        digest.update(b"\x00")
    return digest.hexdigest()


async def _all(session, model):
    try:
        result = await session.execute(select(model))
        return list(result.scalars().all())
    except Exception:
        return []


async def build_report_snapshot(
    session,
    regulation_version_id: str,
    plan_id: str,
    scope=None,
    created_by: Optional[str] = None,
    correlation_id: Optional[str] = None,
    rationale: Optional[str] = None,
    evaluation: Optional[dict] = None,
) -> ReportSnapshot:
    """Deep-copy current versioned state into an immutable snapshot payload."""
    plan = await session.get(MAPPlan, plan_id)
    if plan is None:
        raise ValueError("Plan not found")

    if scope is not None:
        bank_id = getattr(scope, "bank_id", None)
        if bank_id and getattr(plan, "bank_id", None) and plan.bank_id != bank_id:
            raise ValueError("Plan not found")

    items = [i for i in await _all(session, MAPPlanItem) if str(i.plan_id) == str(plan_id)]
    obligations = {
        str(o.id): o
        for o in await _all(session, Obligation)
        if str(o.regulation_version_id) == str(regulation_version_id)
    }
    maps = {str(m.id): m for m in await _all(session, MAP) if str(getattr(m, "map_plan_id", None)) == str(plan_id)}
    # Fall back to obligation-linked MAP ids when the plan link is unset.
    for item in items:
        if item.map_id and str(item.map_id) not in maps:
            for m in await _all(session, MAP):
                if str(m.id) == str(item.map_id):
                    maps[str(m.id)] = m
    evidence_rows = [e for e in await _all(session, Evidence) if str(e.map_id) in maps]
    assessments = [a for a in await _all(session, EvidenceAssessment)
                   if str(a.evidence_id) in {str(e.id) for e in evidence_rows}]
    latest: dict[str, EvidenceAssessment] = {}
    for a in assessments:
        key = str(a.evidence_id)
        prev = latest.get(key)
        stamp = getattr(a, "created_at", None) or datetime.min.replace(tzinfo=timezone.utc)
        prev_stamp = getattr(prev, "created_at", None) if prev else None
        if prev is None or (stamp and (prev_stamp is None or stamp >= prev_stamp)):
            latest[key] = a

    def _obligation_entry(item: MAPPlanItem) -> dict:
        obligation = obligations.get(str(item.obligation_id))
        if obligation is None:
            return {
                "obligation_id": str(item.obligation_id),
                "disposition": "UNKNOWN",
                "quote": None,
                "page": None,
                "clause_id": None,
            }
        return {
            "obligation_id": str(obligation.id),
            "clause_id": obligation.clause_id,
            "quote": obligation.quote,
            "page": obligation.page,
            "obligation_text": obligation.obligation_text,
            "disposition": obligation.status,
            "deadline": {
                "kind": obligation.deadline_kind,
                "value": obligation.deadline_value,
                "unit": obligation.deadline_unit,
                "anchor": obligation.deadline_anchor,
            },
        }

    def _evidence_entry(evidence: Evidence) -> dict:
        hit = latest.get(str(evidence.id))
        decision = getattr(hit, "decision", None) if hit is not None else None
        decision = decision or getattr(evidence, "assessment_decision", None) or "attached"
        return {
            "evidence_id": str(evidence.id),
            "file_name": evidence.file_name,
            "decision": decision,
            "approved": decision == "APPROVED",
            "checksum": getattr(evidence, "content_checksum", None),
            "assessor": getattr(hit, "assessor_id", None) if hit is not None else None,
        }

    def _map_entry(map_row: MAP) -> dict:
        rows = [e for e in evidence_rows if str(e.map_id) == str(map_row.id)]
        return {
            "map_id": str(map_row.id),
            "description": map_row.description,
            "status": map_row.status,
            "approval_state": getattr(map_row, "approval_state", None),
            "evidence": [_evidence_entry(e) for e in rows],
        }

    obligation_entries = [_obligation_entry(i) for i in items]
    map_entries = [_map_entry(m) for m in maps.values()]

    artifact_hashes = {
        f"obligation:{e['obligation_id']}": _sha256(e["obligation_id"], e.get("quote"), e.get("disposition"))
        for e in obligation_entries
    }
    artifact_hashes.update(
        {f"map:{e['map_id']}": _sha256(e["map_id"], e["description"], e["status"]) for e in map_entries}
    )
    for map_row in maps.values():
        for e in [x for x in evidence_rows if str(x.map_id) == str(map_row.id)]:
            artifact_hashes[f"evidence:{e.id}"] = _sha256(
                str(e.id), getattr(e, "content_text", None) or e.file_name,
                getattr(e, "content_checksum", None),
            )

    cutoff = _utcnow()
    payload = {
        "regulation_version_id": str(regulation_version_id),
        "plan_id": str(plan_id),
        "plan_version": getattr(plan, "version_number", None),
        "plan_status": getattr(plan, "status", None),
        "data_cutoff": cutoff.isoformat(),
        "obligations": obligation_entries,
        "maps": map_entries,
        # No exception model exists yet; the key reserves the state slot so
        # future exception workflow states are snapshot-covered.
        "exceptions": [],
        "artifact_hashes": artifact_hashes,
        "snapshot_correlation_id": correlation_id,
        "generated_by": created_by,
        # Task 12: latest gold-set evaluation attached to the frozen snapshot.
        "evaluation": evaluation,
        "evaluation_protocol": "pilot-eval-v1",
    }

    snapshot = ReportSnapshot(
        regulation_version_id=str(regulation_version_id),
        plan_id=str(plan_id),
        payload=copy.deepcopy(payload),
        data_cutoff=cutoff,
        created_by=created_by,
        bank_id=getattr(scope, "bank_id", None) or getattr(plan, "bank_id", None),
        legal_entity_id=(getattr(scope, "legal_entity_ids", None) or [None])[0]
        if getattr(scope, "legal_entity_ids", None)
        else getattr(plan, "legal_entity_id", None),
        rationale=rationale,
    )
    session.add(snapshot)

    # Actor/reason/correlation/before-after audit trail for the snapshot itself.
    try:
        from app.models.audit import AuditLog

        session.add(
            AuditLog(
                actor_id=None,
                action="report_snapshot_created",
                payload={
                    "snapshot_plan_id": str(plan_id),
                    "regulation_version_id": str(regulation_version_id),
                    "actor": created_by,
                    "reason": rationale,
                    "correlation_id": correlation_id,
                    "artifact_hashes": artifact_hashes,
                },
                correlation_id=correlation_id,
                before=None,
                after={"plan_status": getattr(plan, "status", None)},
            )
        )
    except Exception:
        pass

    try:
        await session.commit()
    except Exception:
        pass
    try:
        await session.refresh(snapshot)
    except Exception:
        pass
    return snapshot


async def get_snapshot(session, snapshot_id: str) -> Optional[ReportSnapshot]:
    try:
        return await session.get(ReportSnapshot, snapshot_id)
    except Exception:
        return None


async def latest_snapshot(session, regulation_version_id: str) -> Optional[ReportSnapshot]:
    """Newest snapshot for a regulation version, or None (best-effort)."""
    try:
        result = await session.execute(
            select(ReportSnapshot)
            .where(ReportSnapshot.regulation_version_id == str(regulation_version_id))
            .order_by(ReportSnapshot.created_at.desc())
        )
        rows = list(result.scalars().all())
        return rows[0] if rows else None
    except Exception:
        return None
