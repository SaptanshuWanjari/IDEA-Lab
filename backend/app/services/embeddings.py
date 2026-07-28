from typing import Any

from qdrant_client.models import PointStruct

from app.llm.embeddings import EmbeddingClient
from app.schemas.document import DocumentStructure
from app.vector.client import HybridVectorStore


class EmbeddingService:
    def __init__(self, store: HybridVectorStore, embedder: EmbeddingClient | None = None):
        self.store = store
        self._embedder: EmbeddingClient = embedder or EmbeddingClient()

    def ingest(self, regulation_id: str, document: DocumentStructure, doc_type: str):
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
        points = []
        for i, chunk in enumerate(chunks):
            vector = sample if i == 0 else self._embedder.embed(chunk["text"])
            points.append(
                PointStruct(
                    id=f"{regulation_id}-chunk-{i}",
                    vector=vector,
                    payload={
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
                    },
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
