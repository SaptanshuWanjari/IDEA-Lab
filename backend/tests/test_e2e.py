import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


@pytest.fixture
def auth_cookies(client):
    email = "e2e@pravah.in"
    password = "e2e123"
    client.post("/auth/register", json={"email": email, "password": password, "role": "compliance_officer"})
    resp = client.post("/auth/login", json={"email": email, "password": password})
    return resp.cookies


@pytest.mark.skip(reason="Requires full stack: Postgres, Qdrant, Neo4j, MinIO, Ollama")
def test_upload_and_generate(client, auth_cookies):
    from io import BytesIO

    resp = client.post(
        "/regulations/",
        data={"title": "E2E Test Circular"},
        files={"file": ("test.pdf", BytesIO(b"%PDF-1.4 fake pdf content"), "application/pdf")},
        cookies=auth_cookies,
    )
    assert resp.status_code == 201
    regulation = resp.json()

    gen_resp = client.post(f"/regulations/{regulation['id']}/generate", cookies=auth_cookies)
    assert gen_resp.status_code in (200, 202)
