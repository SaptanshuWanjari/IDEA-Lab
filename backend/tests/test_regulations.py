import pytest

from app.models.regulation import Regulation
from app.services.regulation_service import RegulationService


class FakeStorage:
    def upload(self, bucket, object_name, data, content_type):
        return f"{bucket}/{object_name}"


class FakeSession:
    def __init__(self):
        self.duplicate = False
        self.added = []

    async def execute(self, stmt):
        class R:
            def scalar_one_or_none(_self):
                return Regulation() if self.duplicate else None
        return R()

    def add(self, obj):
        self.added.append(obj)

    async def commit(self):
        pass

    async def refresh(self, obj):
        pass


@pytest.mark.asyncio
async def test_upload_same_pdf_rejected():
    session = FakeSession()
    service = RegulationService(session, FakeStorage())
    pdf = b"same pdf bytes"
    user_id = "cdf0cb9b-3b74-44d5-9df7-fa75137467b5"
    await service.create(pdf, "a.pdf", "t", user_id)
    session.duplicate = True
    with pytest.raises(ValueError, match="already been uploaded"):
        await service.create(pdf, "a.pdf", "t", user_id)
