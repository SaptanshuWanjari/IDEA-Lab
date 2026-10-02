import logging
import os
from typing import Any, Optional

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchAny,
    MatchValue,
    PointStruct,
    VectorParams,
)
from tantivy import Document, Index, SchemaBuilder


def _matches_filters(record: dict[str, Any], filters: dict[str, Any]) -> bool:
    for key, expected in filters.items():
        if expected is None:
            continue
        actual = record.get(key)
        if isinstance(expected, (list, tuple, set)):
            allowed = [x for x in expected if x is not None]
            if not allowed:
                continue
            if actual not in allowed:
                return False
        else:
            if actual in (None, "") and expected in (None, ""):
                continue
            if actual != expected:
                return False
    return True


logger = logging.getLogger(__name__)

# Schema version for the Tantivy BM25 index. Bumped to v2 when scope/version
# fields (bank_id, legal_entity_id, regulation_version_id, ...) were added;
# a versioned path avoids opening a stale on-disk index whose schema no
# longer matches.
TANTIVY_SCHEMA_VERSION = "v2"


class HybridVectorStore:
    _instance: "HybridVectorStore | None" = None

    def __new__(cls, qdrant_url: str = "", index_path: str = "/tmp/pravah_tantivy_v2"):
        if cls._instance is None:
            inst = super().__new__(cls)
            inst._initialized = False
            cls._instance = inst
        return cls._instance

    def __init__(self, qdrant_url: str = "", index_path: str = "/tmp/pravah_tantivy_v2"):
        if self._initialized:
            return
        self._initialized = True
        self.qdrant = QdrantClient(url=qdrant_url)
        self.index_path = index_path
        self._init_tantivy()

    def _init_tantivy(self):
        schema = (
            SchemaBuilder()
            .add_text_field("text", stored=True)
            .add_text_field("chunk_id", stored=True, tokenizer_name="raw")
            .add_text_field("document_type", stored=True)
            .add_text_field("section", stored=True)
            .add_integer_field("page", stored=True)
            .add_text_field("bank_id", stored=True, tokenizer_name="raw")
            .add_text_field("legal_entity_id", stored=True, tokenizer_name="raw")
            .add_text_field("regulation_version_id", stored=True, tokenizer_name="raw")
            .add_text_field("source_version_id", stored=True, tokenizer_name="raw")
            .add_text_field("classification", stored=True, tokenizer_name="raw")
            .build()
        )
        os.makedirs(self.index_path, exist_ok=True)
        try:
            self.tantivy = Index(schema, path=self.index_path)
        except ValueError:
            # A stale index dir with an older schema exists (e.g. pre-scope
            # fields). Open it read-only-compatible rather than crash; new
            # docs pick up scope fields after the next reindex. Never delete
            # the directory silently.
            logger.warning("Tantivy schema mismatch at %s; opening existing index", self.index_path)
            self.tantivy = Index.open(self.index_path)
        self.writer = self.tantivy.writer(50_000_000, 1)

    def ensure_collection(self, name: str, size: int = 1024):
        try:
            self.qdrant.get_collection(name)
        except Exception:
            self.qdrant.create_collection(
                collection_name=name,
                vectors_config=VectorParams(size=size, distance=Distance.COSINE),
            )

    def ensure_payload_indexes(self, collection: str):
        """Create Qdrant payload indexes for scope/version filters. Idempotent."""
        for field in ("bank_id", "legal_entity_id", "regulation_version_id", "source_version_id", "classification"):
            try:
                self.qdrant.create_payload_index(
                    collection_name=collection,
                    field_name=field,
                    field_schema="keyword",
                )
            except Exception:
                pass

    def delete_regulation(self, collection: str, regulation_id: str):
        self.qdrant.delete(
            collection_name=collection,
            points_selector=Filter(
                must=[FieldCondition(key="regulation_id", match=MatchValue(value=regulation_id))]
            ),
        )

    def upsert(self, collection: str, points: list[PointStruct]):
        self.qdrant.upsert(collection_name=collection, points=points)
        try:
            self.ensure_payload_indexes(collection)
        except Exception:
            pass
        for p in points:
            doc_kwargs: dict[str, Any] = {
                "text": p.payload.get("text") or "",
                "chunk_id": str(p.payload.get("chunk_id") or p.id),
                "document_type": p.payload.get("document_type") or "",
                "section": p.payload.get("section") or "",
                "page": p.payload.get("source_page") or 0,
                "bank_id": p.payload.get("bank_id") or "",
                "legal_entity_id": p.payload.get("legal_entity_id") or "",
                "regulation_version_id": p.payload.get("regulation_version_id") or "",
                "source_version_id": p.payload.get("source_version_id") or "",
                "classification": p.payload.get("classification") or "",
            }
            try:
                document = Document(**doc_kwargs)
            except (TypeError, ValueError):
                # Opened a stale pre-scope index: index core fields only.
                document = Document(
                    text=doc_kwargs["text"],
                    chunk_id=doc_kwargs["chunk_id"],
                    document_type=doc_kwargs["document_type"],
                    section=doc_kwargs["section"],
                    page=doc_kwargs["page"],
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
            conditions = []
            for k, v in filters.items():
                if v is None:
                    continue
                if isinstance(v, (list, tuple, set)):
                    values = [x for x in v if x is not None]
                    if not values:
                        continue
                    if len(values) == 1:
                        conditions.append(FieldCondition(key=k, match=MatchValue(value=values[0])))
                    else:
                        conditions.append(FieldCondition(key=k, match=MatchAny(any=values)))
                else:
                    conditions.append(FieldCondition(key=k, match=MatchValue(value=v)))
            q_filter = Filter(must=conditions) if conditions else None
        return self.qdrant.query_points(
            collection_name=collection,
            query=vector,
            limit=limit,
            query_filter=q_filter,
        ).points

    def bm25_search(
        self,
        query_text: str,
        limit: int = 50,
        filters: Optional[dict[str, Any]] = None,
    ) -> list[dict]:
        self.tantivy.reload()
        searcher = self.tantivy.searcher()
        query = self.tantivy.parse_query(query_text, ["text"])
        # Over-fetch so scope post-filtering still returns `limit` hits.
        fetch = limit * 5 if filters else limit
        top_docs = searcher.search(query, fetch)
        docs = []
        for score, doc_addr in top_docs.hits:
            d = searcher.doc(doc_addr)
            chunk_id = d.get_first("chunk_id")
            record: dict[str, Any] = {"chunk_id": chunk_id, "score": score}
            for field in ("bank_id", "legal_entity_id", "regulation_version_id", "source_version_id", "classification"):
                try:
                    record[field] = d.get_first(field)
                except Exception:
                    pass
            if filters and not _matches_filters(record, filters):
                continue
            docs.append(record)
            if len(docs) >= limit:
                break
        return docs
