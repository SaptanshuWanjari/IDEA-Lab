import pytest

from app.agents.graph import AgentGraph
from app.agents.nodes import _extract_json


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
