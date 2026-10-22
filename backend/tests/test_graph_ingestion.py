import pytest
from app.services.graph_service import GraphService
from app.graph.client import GraphClient
from app.schemas.document import DocumentStructure, Clause


@pytest.fixture
def graph_service():
    client = GraphClient()
    # Clear any existing test data
    client.run("MATCH (n) DETACH DELETE n")
    return GraphService(client)


def test_clause_nodes_created_on_ingestion(graph_service):
    """Verify Clause nodes and CONTAINS relationships are created without ConstraintError."""
    regulation_id = "test-reg-001"
    title = "Test Regulation"
    clauses = [
        Clause(id="1", text="Clause 1 text", section=None),
        Clause(id="2", text="Clause 2 text", section="1"),
    ]
    document = DocumentStructure(
        title=title,
        sections=[],
        clauses=clauses,
        tables=[],
        entities=[],
        metadata={"source": "test"},
        raw_markdown="Test content",
    )

    # This should not raise ConstraintError
    graph_service.ingest_regulation(
        regulation_id=regulation_id,
        title=title,
        document=document,
        bank_id="test-bank",
    )

    # Check Clause nodes exist
    result = graph_service.client.run(
        "MATCH (c:Clause) WHERE c.regulation_id = $reg_id RETURN c.id, c.text",
        {"reg_id": regulation_id}
    )
    assert len(result) == 2, f"Expected 2 Clause nodes, got {len(result)}"
    ids = {r["c.id"] for r in result}
    assert ids == {"test-reg-001-1", "test-reg-001-2"}, f"Clause IDs: {ids}"

    # Check CONTAINS relationships
    result = graph_service.client.run(
        "MATCH (r:Regulation {id: $reg_id})-[:CONTAINS]->(c:Clause) RETURN count(*) as cnt",
        {"reg_id": regulation_id}
    )
    assert result[0]["cnt"] == 2, f"Expected 2 CONTAINS relationships, got {result[0]['cnt']}"

    # Check Regulation node exists with correct title
    result = graph_service.client.run(
        "MATCH (r:Regulation {id: $reg_id}) RETURN r.title as title",
        {"reg_id": regulation_id}
    )
    assert len(result) == 1
    assert result[0]["title"] == title


def test_ingestion_with_source_version_id(graph_service):
    """Verify ingestion works with source_version_id (SourceVersion path)."""
    regulation_id = "test-reg-002"
    title = "Test Regulation with SourceVersion"
    source_version_id = "sv-001"
    clauses = [
        Clause(id="1", text="Clause 1 text", section=None),
    ]
    document = DocumentStructure(
        title=title,
        sections=[],
        clauses=clauses,
        tables=[],
        entities=[],
        metadata={"source": "test"},
        raw_markdown="Test content",
    )

    graph_service.ingest_regulation(
        regulation_id=regulation_id,
        title=title,
        document=document,
        source_version_id=source_version_id,
        bank_id="test-bank",
        legal_entity_id="test-entity",
        regulation_version_id="rv-001",
        classification="RBI Circular",
    )

    # Check SourceVersion node
    result = graph_service.client.run(
        "MATCH (sv:SourceVersion {id: $id}) RETURN sv.regulation_id as reg_id",
        {"id": source_version_id}
    )
    assert len(result) == 1
    assert result[0]["reg_id"] == regulation_id

    # Check Clause nodes linked to SourceVersion
    result = graph_service.client.run(
        "MATCH (sv:SourceVersion {id: $id})-[:CONTAINS]->(c:Clause) RETURN c.id",
        {"id": source_version_id}
    )
    assert len(result) == 1
    assert result[0]["c.id"] == f"{regulation_id}-1"


def test_ingestion_idempotent(graph_service):
    """Running ingestion twice should not create duplicates or errors."""
    regulation_id = "test-reg-003"
    title = "Test Regulation Idempotent"
    clauses = [
        Clause(id="1", text="Clause 1 text", section=None),
    ]
    document = DocumentStructure(
        title=title,
        sections=[],
        clauses=clauses,
        tables=[],
        entities=[],
        metadata={"source": "test"},
        raw_markdown="Test content",
    )

    # First ingestion
    graph_service.ingest_regulation(
        regulation_id=regulation_id,
        title=title,
        document=document,
        bank_id="test-bank",
    )

    # Second ingestion (should be idempotent)
    graph_service.ingest_regulation(
        regulation_id=regulation_id,
        title=title,
        document=document,
        bank_id="test-bank",
    )

    # Should still have only 1 Clause node
    result = graph_service.client.run(
        "MATCH (c:Clause) WHERE c.regulation_id = $reg_id RETURN count(*) as cnt",
        {"reg_id": regulation_id}
    )
    assert result[0]["cnt"] == 1, f"Expected 1 Clause node after second ingestion, got {result[0]['cnt']}"

    # Should still have only 1 CONTAINS relationship
    result = graph_service.client.run(
        "MATCH (r:Regulation {id: $reg_id})-[:CONTAINS]->(c:Clause) RETURN count(*) as cnt",
        {"reg_id": regulation_id}
    )
    assert result[0]["cnt"] == 1, f"Expected 1 CONTAINS after second ingestion, got {result[0]['cnt']}"