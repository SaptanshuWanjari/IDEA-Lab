import json
from unittest.mock import MagicMock, patch

from app.schemas.document import Clause, DocumentStructure
from app.services.graph_service import GraphService


def test_relation_extraction_prompts_llm():
    client = MagicMock()
    client.run.return_value = []
    service = GraphService(client)

    doc = DocumentStructure(
        clauses=[
            Clause(id="1", text="Banks must implement MFA."),
            Clause(id="2", text="This amends the previous clause."),
        ]
    )

    mock_response = MagicMock()
    mock_response.json.return_value = {
        "message": {
            "content": json.dumps(
                [{"source": "1", "target": "2", "type": "AMENDS"}]
            )
        }
    }
    mock_response.raise_for_status = MagicMock()

    with patch("app.services.graph_service.httpx.post", return_value=mock_response):
        service.ingest_regulation("reg-1", "Title", doc)

    calls = [c for c in client.run.call_args_list if "AMENDS" in str(c)]
    assert len(calls) > 0
