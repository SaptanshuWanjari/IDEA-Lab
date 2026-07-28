import pytest

from app.graph.client import GraphClient
from app.schemas.document import Clause, DocumentStructure
from app.services.graph_service import GraphService


@pytest.mark.skip(reason="Requires Neo4j running")
def test_graph_ingestion():
    client = GraphClient()
    client.ensure_schema()
    service = GraphService(client)
    doc = DocumentStructure(clauses=[Clause(id="1", text="Banks shall report fraud", section="1")])
    service.ingest_regulation("reg-1", "Fraud Circular", doc)
    result = client.run(
        "MATCH (r:Regulation {id: 'reg-1'})-[:CONTAINS]->(c:Clause) RETURN c.text AS text"
    )
    assert any("Banks shall report fraud" == r["text"] for r in result)
