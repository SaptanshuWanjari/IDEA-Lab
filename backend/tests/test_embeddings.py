import pytest

from app.schemas.document import Clause, DocumentStructure
from app.services.embeddings import EmbeddingService
from app.vector.client import HybridVectorStore


@pytest.mark.skip(reason="Requires Qdrant running")
def test_chunk_strategies():
    store = HybridVectorStore("http://localhost:6333")
    service = EmbeddingService(store)
    doc = DocumentStructure(
        clauses=[
            Clause(id="1", text="All banks shall implement MFA.", section="4"),
            Clause(id="2", text="Banks must report fraud within 7 days.", section="4"),
        ]
    )
    service.ingest("reg-1", doc, "RBI Circular")
    results = store.dense_search("regulation_chunks", [0.0] * 768, limit=5)
    assert len(results) >= 2
