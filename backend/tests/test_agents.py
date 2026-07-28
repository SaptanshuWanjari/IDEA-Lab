import pytest

from app.agents.graph import AgentGraph


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
