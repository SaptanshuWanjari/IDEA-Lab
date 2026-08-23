from unittest.mock import MagicMock, patch

import pytest

from app.agents.graph import AgentGraph
from app.agents.nodes import AgentNodes, _extract_json


@pytest.mark.skip(reason="Requires Ollama running")
def test_agent_pipeline():
    graph = AgentGraph()
    result = graph.run(
        "reg-1",
        "Banks must report fraud within 7 days. IT shall implement MFA by Sep 2026.",
        [{"id": "1", "text": "Banks must report fraud within 7 days"}],
    )
    assert "summary" in result
    assert "generated_maps" in result


def test_extract_json_parses_markdown_fenced_array():
    response = '```json\n[{"description": "A", "owner_department": "IT"}]\n```'
    result = _extract_json(response)
    assert result == [{"description": "A", "owner_department": "IT"}]


def test_extract_json_repairs_trailing_comma():
    response = '[\n  {"description": "A", "source_clauses": ["1"]},\n  {"description": "B", "source_clauses": ["2"]},\n]'
    result = _extract_json(response)
    assert isinstance(result, list)
    assert len(result) == 2
    assert result[0]["description"] == "A"
    assert result[1]["description"] == "B"


def test_extract_json_ignores_surrounding_text():
    response = 'Here is the output:\n```json\n[{"a": 1}]\n```\nHope this helps.'
    result = _extract_json(response)
    assert result == [{"a": 1}]


def test_extract_json_wraps_single_object():
    response = '{"description": "A", "owner_department": "IT"}'
    result = _extract_json(response)
    assert result == {"description": "A", "owner_department": "IT"}


def test_extract_json_returns_default_for_gibberish():
    result = _extract_json("not json", default=[])
    assert result == []


def _mock_nodes(response="[]"):
    client = MagicMock()
    client.chat.return_value = response
    return AgentNodes(client)


def test_requirements_collects_graph_context_for_all_clauses():
    nodes = _mock_nodes()
    state = {
        "regulation_id": "reg-1",
        "summary": "summary",
        "clauses": [{"id": "1", "text": "a"}, {"id": "2", "text": "b"}],
    }
    with patch("app.agents.nodes.retrieve") as mock_retrieve, patch("app.agents.nodes.query_graph") as mock_query:
        mock_retrieve.return_value = []
        mock_query.side_effect = [
            [{"text": "shared"}, {"text": "only-a"}],
            [{"text": "shared"}, {"text": "only-b"}],
        ]
        nodes.requirements(state)

    assert mock_query.call_count == 2
    ids = [call.args[1]["id"] for call in mock_query.call_args_list]
    assert ids == ["reg-1-1", "reg-1-2"]
    prompt = nodes.client.chat.call_args[0][0][1]["content"]
    assert "shared" in prompt
    assert "only-a" in prompt
    assert "only-b" in prompt


def test_requirements_limits_graph_context_to_first_20_clauses():
    nodes = _mock_nodes()
    clauses = [{"id": str(i), "text": f"clause {i}"} for i in range(25)]
    state = {"regulation_id": "reg-1", "summary": "summary", "clauses": clauses}
    with patch("app.agents.nodes.retrieve") as mock_retrieve, patch("app.agents.nodes.query_graph") as mock_query:
        mock_retrieve.return_value = []
        mock_query.return_value = []
        nodes.requirements(state)
    assert mock_query.call_count == 20


def test_requirements_uses_document_type_filter_when_present():
    nodes = _mock_nodes()
    state = {
        "regulation_id": "reg-1",
        "summary": "summary",
        "clauses": [],
        "document_type": "SEBI Circular",
    }
    with patch("app.agents.nodes.retrieve") as mock_retrieve, patch("app.agents.nodes.query_graph") as mock_query:
        mock_retrieve.return_value = []
        nodes.requirements(state)
    mock_retrieve.assert_called_once()
    assert mock_retrieve.call_args.kwargs["filters"] == {"document_type": "SEBI Circular"}


def test_requirements_uses_no_filter_when_document_type_missing():
    nodes = _mock_nodes()
    state = {"regulation_id": "reg-1", "summary": "summary", "clauses": []}
    with patch("app.agents.nodes.retrieve") as mock_retrieve, patch("app.agents.nodes.query_graph") as mock_query:
        mock_retrieve.return_value = []
        nodes.requirements(state)
    mock_retrieve.assert_called_once()
    assert mock_retrieve.call_args.kwargs["filters"] == {}
    assert mock_retrieve.call_args.kwargs.get("filters", {}).get("document_type") != "RBI Circular"


def test_generate_maps_uses_document_type_filter_when_present():
    nodes = _mock_nodes()
    state = {"requirements": [], "document_type": "SEBI Circular"}
    with patch("app.agents.nodes.retrieve") as mock_retrieve:
        mock_retrieve.return_value = []
        nodes.generate_maps(state)
    mock_retrieve.assert_called_once_with(
        "Measurable Action Point implementation plan",
        filters={"document_type": "SEBI Circular"},
    )


def test_generate_maps_uses_no_filter_when_document_type_missing():
    nodes = _mock_nodes()
    state = {"requirements": []}
    with patch("app.agents.nodes.retrieve") as mock_retrieve:
        mock_retrieve.return_value = []
        nodes.generate_maps(state)
    mock_retrieve.assert_called_once_with(
        "Measurable Action Point implementation plan",
        filters={},
    )
