import json
from unittest.mock import MagicMock, patch

import pytest

from app.schemas.document import Clause, DocumentStructure
from app.services.graph_service import GraphService


def _make_llm_response(content: str):
    response = MagicMock()
    response.json.return_value = {"message": {"content": content}}
    response.raise_for_status = MagicMock()
    return response


def test_relation_extraction_writes_amends_edge():
    client = MagicMock()
    client.run.return_value = []
    service = GraphService(client)

    doc = DocumentStructure(
        clauses=[
            Clause(id="1", text="Banks must implement MFA."),
            Clause(id="2", text="This amends the previous clause."),
        ]
    )

    with patch("app.services.graph_service.LLMClient") as MockLLM:
        instance = MockLLM.return_value
        instance.chat.return_value = json.dumps([{"source": "1", "target": "2", "type": "AMENDS"}])
        service.ingest_regulation("reg-1", "Title", doc)

    relation_calls = [call for call in client.run.call_args_list if "AMENDS" in str(call)]
    assert len(relation_calls) == 1
    args, kwargs = relation_calls[0]
    assert args[1]["source"] == "reg-1-1"
    assert args[1]["target"] == "reg-1-2"


def test_relation_extraction_skips_invalid_type():
    client = MagicMock()
    client.run.return_value = []
    service = GraphService(client)

    doc = DocumentStructure(clauses=[Clause(id="1", text="A"), Clause(id="2", text="B")])

    with patch("app.services.graph_service.LLMClient") as MockLLM:
        instance = MockLLM.return_value
        instance.chat.return_value = json.dumps([{"source": "1", "target": "2", "type": "HACK"}])
        service.ingest_regulation("reg-1", "Title", doc)

    relation_calls = [call for call in client.run.call_args_list if "]->(b)" in str(call)]
    assert len(relation_calls) == 0


def test_relation_extraction_skips_missing_clause_refs():
    client = MagicMock()
    client.run.return_value = []
    service = GraphService(client)

    doc = DocumentStructure(clauses=[Clause(id="1", text="A")])

    with patch("app.services.graph_service.LLMClient") as MockLLM:
        instance = MockLLM.return_value
        instance.chat.return_value = json.dumps([{"source": "1", "target": "99", "type": "REQUIRES"}])
        service.ingest_regulation("reg-1", "Title", doc)

    relation_calls = [call for call in client.run.call_args_list if "REQUIRES" in str(call)]
    assert len(relation_calls) == 0


def test_relation_extraction_continues_on_llm_error():
    client = MagicMock()
    client.run.return_value = []
    service = GraphService(client)

    doc = DocumentStructure(clauses=[Clause(id="1", text="A")])

    with patch("app.services.graph_service.LLMClient") as MockLLM:
        instance = MockLLM.return_value
        instance.chat.side_effect = RuntimeError("ollama down")
        service.ingest_regulation("reg-1", "Title", doc)

    # Should still create the regulation and clause
    assert any("MERGE (r:Regulation" in str(call) for call in client.run.call_args_list)
    assert any("MERGE (c:Clause" in str(call) for call in client.run.call_args_list)


def test_parse_relations_extracts_json_from_prose():
    service = GraphService(MagicMock())
    content = "Here are the relations:\n[{\"source\": \"1\", \"target\": \"2\", \"type\": \"DEFINES\"}]\nThat is all."
    relations = service._parse_relations(content)
    assert relations == [{"source": "1", "target": "2", "type": "DEFINES"}]


def test_parse_relations_returns_empty_on_bad_json():
    service = GraphService(MagicMock())
    assert service._parse_relations("not json") == []
