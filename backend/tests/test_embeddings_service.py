from unittest.mock import MagicMock

from app.schemas.document import Clause, DocumentStructure
from app.services.embeddings import EmbeddingService
from app.vector.client import HybridVectorStore


class StubEmbedder:
    def embed(self, text: str) -> list[float]:
        return [0.1, 0.2, 0.3]


def test_embedding_service_uses_stub_embedder():
    store = MagicMock(spec=HybridVectorStore)
    service = EmbeddingService(store, embedder=StubEmbedder())
    doc = DocumentStructure(
        clauses=[
            Clause(id="1", text="All banks shall implement MFA.", section="4"),
        ]
    )
    service.ingest("reg-1", doc, "RBI Circular")
    store.ensure_collection.assert_called_once_with("regulation_chunks", size=3)
    assert store.upsert.call_count == 1
    points = store.upsert.call_args[0][1]
    assert len(points) == 1
    assert points[0].vector == [0.1, 0.2, 0.3]
