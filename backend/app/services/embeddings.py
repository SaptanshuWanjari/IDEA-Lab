import uuid
from typing import Any

from qdrant_client.models import PointStruct

from app.llm.embeddings import EmbeddingClient
from app.schemas.document import DocumentStructure
from app.vector.client import HybridVectorStore


class ChunkIdentity:
    """Unique chunk identifier scoped to a source version.

    Previously point ids restarted at zero per document, so two
    same-sized documents produced colliding ids. The identity string
    ``{source_version_id}:{index}`` is unique across documents; the
    Qdrant point id is a deterministic UUID derived from it (Qdrant
    only accepts int/UUID point ids).
    """

    @staticmethod
    def create(source_version_id: str, index: int) -> str:
        return f"{source_version_id}:{index}"

    @staticmethod
    def point_id(chunk_identity: str) -> str:
        return str(uuid.uuid5(uuid.NAMESPACE_URL, chunk_identity))


class EmbeddingService:
    def __init__(self, store: HybridVectorStore, embedder: EmbeddingClient | None = None):
        self.store = store
        self._embedder: EmbeddingClient = embedder or EmbeddingClient()

    def ingest(
        self,
        regulation_id: str,
        document: DocumentStructure,
        doc_type: str,
        *,
        source_version_id: str | None = None,
        bank_id: str | None = None,
        legal_entity_id: str | None = None,
        regulation_version_id: str | None = None,
        classification: str | None = None,
    ):
        if doc_type in ("RBI Circular", "Regulation"):
            chunks = self._late_chunk(document)
        elif doc_type in ("Policy", "SOP"):
            chunks = self._semantic_chunk(document)
        else:
            chunks = self._recursive_chunk(document)

        if not chunks:
            return

        sample = self._embedder.embed(chunks[0]["text"])
        # ponytail: 768 is the dimension of nomic-embed-text; used only when document has no chunks
        dim = len(sample) if sample else 768
        self.store.ensure_collection("regulation_chunks", size=dim)
        self.store.delete_regulation("regulation_chunks", regulation_id)
        points = []
        version_key = source_version_id or regulation_id
        for i, chunk in enumerate(chunks):
            vector = sample if i == 0 else self._embedder.embed(chunk["text"])
            chunk_identity = ChunkIdentity.create(version_key, i)
            payload: dict[str, Any] = {
                "text": chunk["text"],
                "regulation_id": regulation_id,
                "document_type": doc_type,
                "section": chunk.get("section"),
                "clause": chunk.get("clause"),
                "department": chunk.get("department", []),
                "entities": chunk.get("entities", []),
                "source_page": chunk.get("page", 1),
                "chunk_index": i,
                "total_chunks": len(chunks),
                "chunk_id": chunk_identity,
                "source_version_id": source_version_id or regulation_id,
            }
            if bank_id is not None:
                payload["bank_id"] = bank_id
            if legal_entity_id is not None:
                payload["legal_entity_id"] = legal_entity_id
            if regulation_version_id is not None:
                payload["regulation_version_id"] = regulation_version_id
            if classification is not None:
                payload["classification"] = classification
            points.append(
                PointStruct(
                    id=ChunkIdentity.point_id(chunk_identity),
                    vector=vector,
                    payload=payload,
                )
            )
        self.store.upsert("regulation_chunks", points)

    def _late_chunk(self, doc: DocumentStructure) -> list[dict[str, Any]]:
        # For regulations, chunk at clause boundaries to preserve cross-clause context
        return [
            {
                "text": c.text,
                "section": c.section,
                "clause": c.id,
                "page": c.page,
                "strategy": "late",
            }
            for c in doc.clauses
        ]

    def _semantic_chunk(self, doc: DocumentStructure) -> list[dict[str, Any]]:
        # Same as late chunk for MVP: one chunk per clause/section
        return [
            {
                "text": c.text,
                "section": c.section,
                "clause": c.id,
                "page": c.page,
                "strategy": "semantic",
            }
            for c in doc.clauses
        ]

    def _recursive_chunk(self, doc: DocumentStructure) -> list[dict[str, Any]]:
        text = "\n".join(c.text for c in doc.clauses)
        chunks = []
        for i in range(0, len(text), 448):
            chunks.append(
                {
                    "text": text[i : i + 512],
                    "section": None,
                    "clause": None,
                    "page": 1,
                    "strategy": "recursive",
                }
            )
        return chunks
