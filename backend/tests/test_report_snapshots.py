"""Task 10: immutable report snapshots — DB-free (FakeSession).

A snapshot deep-copies regulation-version/plan/MAP/evidence state at build
time; later edits to live rows must not change the stored payload.
"""

from uuid import uuid4

import pytest

from app.services.authorization import RequestScope


def _scope():
    return RequestScope(
        user_id="approver-1",
        bank_id="bank-1",
        legal_entity_ids=["entity-1"],
        department_ids=[],
        role_codes=["compliance_approver"],
    )


def _plan(plan_id="plan-1"):
    from app.models.map_plan import MAPPlan, MAPPlanStatus

    return MAPPlan(
        id=plan_id,
        regulation_version_id="rv-1",
        version_number=1,
        status=MAPPlanStatus.APPROVED.value,
        bank_id="bank-1",
        legal_entity_id="entity-1",
        created_by="maker-1",
        approved_by="approver-1",
    )


def _plan_item(plan_id="plan-1", obligation_id="obl-1", map_id=None):
    from app.models.map_plan import MAPPlanItem

    return MAPPlanItem(
        id=f"item-{obligation_id}",
        plan_id=plan_id,
        obligation_id=obligation_id,
        map_id=str(map_id) if map_id else None,
        description="Report incidents within 24 hours",
        evidence_requirement="incident_report",
    )


def _obligation(oid="obl-1", status="APPROVED"):
    from app.models.obligation import Obligation

    return Obligation(
        id=oid,
        regulation_version_id="rv-1",
        clause_id="3.1",
        quote="Banks shall report incidents within 24 hours.",
        page=4,
        obligation_text="Report incidents within 24 hours",
        status=status,
        bank_id="bank-1",
        legal_entity_id="entity-1",
        created_by="maker-1",
    )


def _map():
    from app.models.map import MAP

    mid = uuid4()
    return MAP(
        id=mid,
        regulation_id=uuid4(),
        map_plan_id="plan-1",
        owner_department_id=uuid4(),
        description="Report incidents within 24 hours",
        status="Completed",
        bank_id="bank-1",
        legal_entity_id="entity-1",
    )


def _evidence(map_id, content="Board resolution 2026/14 approving the remediation plan."):
    from app.models.evidence import Evidence

    return Evidence(
        id=uuid4(),
        map_id=map_id,
        file_url="s3://bucket/opaque-key",
        file_name="Board_Approval.pdf",
        uploaded_by=uuid4(),
        bank_id="bank-1",
        legal_entity_id="entity-1",
        content_text=content,
        content_checksum="cafef00d",
        assessment_decision="APPROVED",
    )


def _assessment(evidence_id):
    from app.models.evidence_assessment import EvidenceAssessment

    return EvidenceAssessment(
        id=uuid4(),
        evidence_id=evidence_id,
        decision="APPROVED",
        assessor_id="approver-1",
        submitter_id="maker-1",
        rationale="Content verified against checklist.",
        bank_id="bank-1",
        legal_entity_id="entity-1",
    )


class _Scalars:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return list(self._rows)


class _Result:
    def __init__(self, rows):
        self._rows = rows

    def scalars(self):
        return _Scalars(self._rows)


class FakeSession:
    """Routes full-table select()s by compiled table name; filters happen in Python."""

    def __init__(self, plan, items, obligations, maps, evidence, assessments):
        from app.models.map_plan import MAPPlan

        self._plan = plan
        self._MAPPlan = MAPPlan
        self._tables = {
            "map_plan_items": list(items),
            "obligations": list(obligations),
            "maps": list(maps),
            "evidence": list(evidence),
            "evidence_assessments": list(assessments),
        }
        self.added = []

    async def get(self, model, oid):
        if model is self._MAPPlan and str(oid) == str(self._plan.id):
            return self._plan
        return None

    async def execute(self, stmt):
        compiled = str(stmt.compile(compile_kwargs={"literal_binds": True}))
        for table in ("map_plan_items", "evidence_assessments", "obligations", "evidence", "maps"):
            if f"FROM {table}" in compiled:
                return _Result(self._tables[table])
        return _Result([])

    def add(self, obj):
        self.added.append(obj)

    async def commit(self):
        pass

    async def refresh(self, obj):
        pass


def _session():
    live_map = _map()
    ev = _evidence(live_map.id)
    return FakeSession(
        plan=_plan(),
        items=[_plan_item(map_id=live_map.id)],
        obligations=[_obligation()],
        maps=[live_map],
        evidence=[ev],
        assessments=[_assessment(ev.id)],
    ), live_map


@pytest.mark.asyncio
async def test_report_snapshot_does_not_change_after_later_map_edit():
    from app.services.report_snapshot import build_report_snapshot

    session, live_map = _session()
    snapshot = await build_report_snapshot(session, "rv-1", "plan-1", scope=_scope())
    assert snapshot.payload["maps"][0]["status"] == "Completed"

    # Later live edits must not leak into the immutable payload.
    live_map.status = "InProgress"
    session._tables["obligations"][0].status = "REJECTED"
    assert snapshot.payload["maps"][0]["status"] == "Completed"
    assert snapshot.payload["obligations"][0]["disposition"] == "APPROVED"


@pytest.mark.asyncio
async def test_snapshot_records_cutoff_versions_hashes_and_dispositions():
    from app.services.report_snapshot import build_report_snapshot

    session, _ = _session()
    snapshot = await build_report_snapshot(
        session, "rv-1", "plan-1", scope=_scope(), created_by="approver-1"
    )
    payload = snapshot.payload
    assert payload["regulation_version_id"] == "rv-1"
    assert payload["plan_id"] == "plan-1"
    assert payload["plan_version"] == 1
    assert payload["data_cutoff"]
    assert payload["obligations"][0]["disposition"] == "APPROVED"
    assert payload["maps"][0]["evidence"][0]["decision"] == "APPROVED"
    assert payload["exceptions"] == []
    assert snapshot.created_by == "approver-1"
    assert len(payload["artifact_hashes"]) >= 3
    for digest in payload["artifact_hashes"].values():
        assert len(digest) == 64
