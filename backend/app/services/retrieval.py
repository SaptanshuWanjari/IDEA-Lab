import re
from typing import Any, Optional

import httpx

from app.config import settings
from app.graph.client import GraphClient
from app.vector.client import HybridVectorStore


class Reranker:
    def __init__(self, model: str | None = None, url: str | None = None):
        self.model = model or settings.ollama_rerank_model
        self.url = url or settings.ollama_url

    def rerank(self, query: str, candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not candidates:
            return []

        prompt = self._build_prompt(query, candidates)
        response = httpx.post(
            f"{self.url.rstrip('/')}/api/chat",
            json={
                "model": self.model,
                "messages": [
                    {"role": "system", "content": "Return only one score per candidate in the format 'label: score' where score is an integer 0-10."},
                    {"role": "user", "content": prompt},
                ],
                "stream": False,
                "options": {"temperature": 0.0, "num_predict": 500},
            },
            timeout=120.0,
        )
        response.raise_for_status()
        content = response.json()["message"]["content"]

        scores = self._parse_scores(content)
        for c in candidates:
            c["rerank_score"] = scores.get(c.get("id", ""), c.get("score", 0))
        return sorted(candidates, key=lambda x: x["rerank_score"], reverse=True)

    def _build_prompt(self, query: str, candidates: list[dict[str, Any]]) -> str:
        lines = [f"Query: {query}\n", "Score each candidate 0-10:\n"]
        for c in candidates:
            label = c.get("id", "?")
            text = c.get("text", "")
            lines.append(f"{label}: {text[:200]}\n")
        return "".join(lines)

    def _parse_scores(self, content: str) -> dict[str, int]:
        scores = {}
        for line in content.splitlines():
            match = re.match(r"(.+?)[:\t]\s*(\d+)", line.strip())
            if match:
                scores[match.group(1).strip()] = int(match.group(2))
        return scores


class RetrievalService:
    def __init__(self, store: HybridVectorStore, graph: GraphClient):
        self.store = store
        self.graph = graph
        self.reranker = Reranker()

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

        dense = self.store.dense_search(
            "regulation_chunks", [0.0] * 768, limit=50, filters=filters
        )
        bm25 = self.store.bm25_search(query, limit=50)

        dense_by_id = {getattr(item, "id", str(rank)): item for rank, item in enumerate(dense)}
        fused = self._reciprocal_rank_fusion(dense, bm25, k=60)
        top = sorted(fused, key=lambda x: x["score"], reverse=True)[:20]

        candidates = []
        for item in top:
            chunk_id = item["id"]
            original = dense_by_id.get(chunk_id)
            payload = getattr(original, "payload", {}) if original else {}
            text = getattr(original, "text", "") or (payload.get("text", "") if isinstance(payload, dict) else "")
            candidates.append({"id": chunk_id, "text": text, "score": item["score"], "source": "vector"})

        reranked = self.reranker.rerank(query, candidates)

        expanded = []
        seen = set()
        for item in reranked:
            chunk_id = item["id"]
            expanded.append(item)
            seen.add(chunk_id)

        for item in reranked[:5]:
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
