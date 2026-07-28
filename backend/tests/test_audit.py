from uuid import uuid4

import pytest

from app.models.audit import AuditLog
from app.models.evidence import Evidence
from app.models.map import MAP
from app.models.regulation import Regulation
from app.services.audit import AuditService


class FakeResult:
    def __init__(self, items):
        self._items = items

    def scalars(self):
        return self

    def all(self):
        return self._items


class FakeSession:
    def __init__(self, regulation=None, maps=None, evidence=None):
        self._regulation = regulation
        self._maps = maps or []
        self._evidence = evidence or []
        self.added = []
        self.committed = 0

    async def get(self, model, id):
        return self._regulation

    async def execute(self, stmt):
        # ponytail: minimal statement router by selected table name
        table_name = getattr(stmt.selected_columns[0].table, "name", None)
        if table_name == "maps":
            return FakeResult(self._maps)
        if table_name == "evidence":
            return FakeResult(self._evidence)
        return FakeResult([])

    def add(self, obj):
        self.added.append(obj)

    async def commit(self):
        self.committed += 1

    async def refresh(self, obj):
        pass


@pytest.mark.asyncio
async def test_log_creates_audit_entry():
    session = FakeSession()
    service = AuditService(session)
    entry = await service.log(action="review_approve", regulation_id=str(uuid4()), map_id=str(uuid4()), actor_id=str(uuid4()))
    assert isinstance(entry, AuditLog)
    assert entry.action == "review_approve"
    assert len(session.added) == 1
    assert session.committed == 1


@pytest.mark.asyncio
async def test_build_report_counts_completeness():
    reg = Regulation(id=uuid4(), title="Test Reg", source_pdf_url="s3://x", status="Review")
    m1 = MAP(id=uuid4(), regulation_id=reg.id, owner_department_id=uuid4(), description="M1", status="Completed")
    m2 = MAP(id=uuid4(), regulation_id=reg.id, owner_department_id=uuid4(), description="M2", status="Pending")
    ev = Evidence(id=uuid4(), map_id=m1.id, file_url="url", file_name="ev.pdf", uploaded_by=uuid4())
    session = FakeSession(regulation=reg, maps=[m1, m2], evidence=[ev])
    service = AuditService(session)
    report = await service.build_report(str(reg.id))
    assert report["regulation"]["title"] == "Test Reg"
    assert report["completed_count"] == 1
    assert report["total_count"] == 2
    assert len(report["maps"]) == 2
    assert len(report["evidence"]) == 1
    assert report["evidence"][0]["file_name"] == "ev.pdf"
    assert "generated_at" in report
