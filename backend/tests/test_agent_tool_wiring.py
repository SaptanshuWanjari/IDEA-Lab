from unittest.mock import MagicMock, patch

from app.agents.nodes import AgentNodes


def test_requirements_node_calls_retrieve():
    client = MagicMock()
    client.chat.return_value = "[]"
    nodes = AgentNodes(client)

    with patch("app.agents.nodes.retrieve", return_value=[{"id": "x", "text": "found"}]) as mock_retrieve:
        with patch("app.agents.nodes.query_graph", return_value=[]) as mock_query_graph:
            nodes.requirements({
                "summary": "MFA requirement",
                "clauses": [{"id": "1", "text": "Implement MFA"}],
                "regulation_id": "RBI-2024-01",
            })

    mock_retrieve.assert_called_once()
    mock_query_graph.assert_called_once()
    assert mock_query_graph.call_args[0][1]["id"] == "RBI-2024-01-1"
