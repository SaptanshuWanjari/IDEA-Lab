from app.services.retrieval import RetrievalService


def test_rrf():
    service = RetrievalService.__new__(RetrievalService)
    a = [type("X", (), {"id": "a"})(), type("X", (), {"id": "b"})()]
    b = [{"chunk_id": "c"}, {"chunk_id": "a"}]
    fused = service._reciprocal_rank_fusion(a, b)
    assert len(fused) == 3
    ids = {item["id"] for item in fused}
    assert ids == {"a", "b", "c"}
