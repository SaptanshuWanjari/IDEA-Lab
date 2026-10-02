"""Task 10: AI run provenance — every LLM stage persists model, prompt
version, input/output hashes, retrieval chunk IDs, validator and reviewer
outcome. No live LLM; fakes only.
"""

from unittest.mock import patch


def test_ai_run_records_retrieval_and_prompt_versions():
    from app.llm.client import record_ai_run

    run = record_ai_run(
        stage="generate_maps",
        model_id="qwen3:8b",
        provider="ollama",
        prompt_version="map_prompt/v1",
        input_text='[{"clause_id": "3.1"}]',
        output_text='[{"description": "Do X"}]',
        retrieval_chunk_ids=["rv-1#0", "rv-1#7"],
        validator_result={"accepted": True, "parsed": 1},
        reviewer_outcome="pending_review",
        correlation_id="corr-1",
        bank_id="bank-1",
        legal_entity_id="entity-1",
        regulation_version_id="rv-1",
    )
    assert run.prompt_version and run.retrieval_manifest and run.model_id
    assert run.stage == "generate_maps"
    assert len(run.input_hash) == 64
    assert len(run.output_hash) == 64
    assert run.input_hash != run.output_hash
    assert "rv-1#0" in run.retrieval_manifest["chunk_ids"]
    assert run.validator_result["accepted"] is True
    assert run.reviewer_outcome == "pending_review"
    assert run.correlation_id == "corr-1"


def test_generate_maps_node_records_ai_run_without_live_llm():
    from types import SimpleNamespace

    from app.agents.nodes import AgentNodes

    client = SimpleNamespace(
        chat=lambda messages: '[{"description": "Report incidents", "owner_department": "Compliance"}]',
        model="fake-model-v1",
    )
    nodes = AgentNodes(client)
    state = {
        "regulation_id": "rv-1",
        "requirements": [{"clause_id": "3.1", "obligation": "Report incidents"}],
    }
    with patch(
        "app.agents.nodes.retrieve",
        return_value=[{"chunk_id": "rv-1#3", "text": "historical plan"}],
    ):
        out = nodes.generate_maps(state)

    assert out["generated_maps"]
    assert nodes.runs, "node must record at least one AIRun"
    run = nodes.runs[-1]
    assert run.prompt_version and run.retrieval_manifest and run.model_id
    assert run.model_id == "fake-model-v1"
    assert "rv-1#3" in run.retrieval_manifest["chunk_ids"]
    assert len(run.input_hash) == 64 and len(run.output_hash) == 64
    assert run.validator_result is not None
    assert run.reviewer_outcome is not None
    assert out["ai_runs"] and out["ai_runs"][0]["prompt_version"] == run.prompt_version
