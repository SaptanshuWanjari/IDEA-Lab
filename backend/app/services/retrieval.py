from typing import Any, Optional

from app.graph.client import GraphClient
from app.vector.client import HybridVectorStore


class RetrievalService:
    def __init__(self, store: HybridVectorStore, graph: GraphClient):
        self.store = store
        self.graph = graph

    def search(
        self,
        query: str,
        document_type: Optional[str] = None,
        department: Optional[str] = None,
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        filters = {}
        if document_type:
            filters["document_type"] = document_type
        if department:
            filters["department"] = department

        # Dense + BM25 + RRF
        dense = self.store.dense_search(
            "regulation_chunks", [0.0] * 768, limit=50, filters=filters
        )
        bm25 = self.store.bm25_search(query, limit=50)

        dense_by_id = {getattr(item, "id", str(rank)): item for rank, item in enumerate(dense)}
        fused = self._reciprocal_rank_fusion(dense, bm25, k=60)
        top = sorted(fused, key=lambda x: x["score"], reverse=True)[:20]

        # Cross-encoder rerank is a placeholder for MVP
        expanded = []
        seen = set()
        for item in top:
            chunk_id = item["id"]
            original = dense_by_id.get(chunk_id)
            payload = getattr(original, "payload", {}) if original else {}
            text = getattr(original, "text", "") or (payload.get("text", "") if isinstance(payload, dict) else "")
            expanded.append({"id": chunk_id, "text": text, "score": item["score"], "source": "vector"})
            seen.add(chunk_id)

        # Knowledge graph expansion: follow related clause edges
        for item in top[:5]:
            original = dense_by_id.get(item["id"])
            payload = getattr(original, "payload", {}) if original else {}
            clause_id = payload.get("clause") if isinstance(payload, dict) else None
            if clause_id:
                related = self._graph_expand(clause_id)
                for r in related:
                    rid = r.get("id")
                    if rid and rid not in seen:
                        expanded.append(
                            {
                                "id": rid,
                                "text": r.get("text", ""),
                                "score": item["score"],
                                "source": "graph",
                            }
                        )
                        seen.add(rid)

        return expanded[: limit + 5]

    def _reciprocal_rank_fusion(
        self, list_a: list[Any], list_b: list[dict[str, Any]], k: int = 60
    ) -> list[dict[str, Any]]:
        scores = {}
        for rank, item in enumerate(list_a):
            key = getattr(item, "id", str(rank))
            scores[key] = scores.get(key, 0) + 1 / (k + rank + 1)
        for rank, item in enumerate(list_b):
            key = item.get("chunk_id", str(rank))
            scores[key] = scores.get(key, 0) + 1 / (k + rank + 1)
        return [{"id": k, "score": v} for k, v in sorted(scores.items(), key=lambda x: x[1], reverse=True)]

    def _graph_expand(self, clause_id: str) -> list[dict[str, Any]]:
        result = self.graph.run(
            "MATCH (c:Clause {id: $id})-[:REQUIRES|:AMENDS|:DEFINES]-(related) RETURN related.id AS id, related.text AS text",
            {"id": clause_id},
        )
        return [{"id": r["id"], "text": r["text"]} for r in result]
