import os
from typing import Any, Optional

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    VectorParams,
)
from tantivy import Document, Index, SchemaBuilder


class HybridVectorStore:
    def __init__(self, qdrant_url: str, index_path: str = "/tmp/pravah_tantivy"):
        self.qdrant = QdrantClient(url=qdrant_url)
        self.index_path = index_path
        self._init_tantivy()

    def _init_tantivy(self):
        schema = (
            SchemaBuilder()
            .add_text_field("text", stored=True)
            .add_text_field("chunk_id", stored=True, tokenizer="raw")
            .add_text_field("document_type", stored=True)
            .add_text_field("section", stored=True)
            .add_integer_field("page", stored=True)
            .build()
        )
        os.makedirs(self.index_path, exist_ok=True)
        self.tantivy = Index(schema, path=self.index_path)
        self.writer = self.tantivy.writer(50_000_000, 1)

    def ensure_collection(self, name: str, size: int = 768):
        try:
            self.qdrant.get_collection(name)
        except Exception:
            self.qdrant.create_collection(
                collection_name=name,
                vectors_config=VectorParams(size=size, distance=Distance.COSINE),
            )

    def upsert(self, collection: str, points: list[PointStruct]):
        self.qdrant.upsert(collection_name=collection, points=points)
        for p in points:
            document = Document(
                text=p.payload.get("text", ""),
                chunk_id=str(p.id),
                document_type=p.payload.get("document_type", ""),
                section=p.payload.get("section", ""),
                page=p.payload.get("source_page", 0),
            )
            self.writer.add_document(document)
        self.writer.commit()

    def dense_search(
        self,
        collection: str,
        vector: list[float],
        limit: int = 50,
        filters: Optional[dict[str, Any]] = None,
    ):
        q_filter = None
        if filters:
            conditions = [
                FieldCondition(key=k, match=MatchValue(value=v))
                for k, v in filters.items()
                if v is not None
            ]
            q_filter = Filter(must=conditions) if conditions else None
        return self.qdrant.search(
            collection_name=collection,
            query_vector=vector,
            limit=limit,
            query_filter=q_filter,
        )

    def bm25_search(self, query_text: str, limit: int = 50) -> list[dict]:
        self.tantivy.reload()
        searcher = self.tantivy.searcher()
        query = self.tantivy.parse_query(query_text, ["text"])
        top_docs = searcher.search(query, limit)
        docs = []
        for score, doc_addr in top_docs:
            d = searcher.doc(doc_addr)
            chunk_id = d.get_first("chunk_id")
            docs.append({"chunk_id": chunk_id, "score": score})
        return docs
