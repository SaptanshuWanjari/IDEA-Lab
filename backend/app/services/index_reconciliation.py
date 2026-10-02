"""Compare indexed chunks against graph clause projections for a source version."""
from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from typing import Any


@dataclass
class ReconciliationReport:
    source_version_id: str
    indexed_chunk_ids: list[str] = field(default_factory=list)
    indexed_clause_ids: list[str] = field(default_factory=list)
    graph_clause_ids: list[str] = field(default_factory=list)
    missing_graph_clause_ids: list[str] = field(default_factory=list)
    missing_index_clause_ids: list[str] = field(default_factory=list)
    healthy: bool = False

    def to_dict(self) -> dict[str, Any]:
        return {
            "source_version_id": self.source_version_id,
            "indexed_chunk_ids": self.indexed_chunk_ids,
            "indexed_clause_ids": self.indexed_clause_ids,
            "graph_clause_ids": self.graph_clause_ids,
            "missing_graph_clause_ids": self.missing_graph_clause_ids,
            "missing_index_clause_ids": self.missing_index_clause_ids,
            "healthy": self.healthy,
        }


IndexFetcher = Callable[[str], list[str] | Awaitable[list[str]]]
GraphFetcher = Callable[[str], list[str] | Awaitable[list[str]]]


class IndexReconciler:
    """Compare Qdrant/Tantivy index state with Neo4j graph projections.

    Construct with lightweight fetchers for unit tests, or with live
    ``vector_store``/``graph_client`` for production use::

        reconciler = IndexReconciler(
            index_fetcher=lambda sv: [...],
            graph_fetcher=lambda sv: [...],
        )
        report = await reconciler.compare("source-version-1")
    """

    def __init__(
        self,
        index_fetcher: IndexFetcher | None = None,
        graph_fetcher: GraphFetcher | None = None,
        vector_store: Any | None = None,
        graph_client: Any | None = None,
    ):
        self._index_fetcher = index_fetcher
        self._graph_fetcher = graph_fetcher
        self._store = vector_store
        self._graph = graph_client

    async def compare(self, source_version_id: str) -> ReconciliationReport:
        indexed = await self._resolve(self._index_fetcher, self._store, source_version_id, kind="index")
        graph_ids = await self._resolve(self._graph_fetcher, self._graph, source_version_id, kind="graph")

        indexed_set = set(indexed)
        graph_set = set(graph_ids)
        missing_graph = sorted(indexed_set - graph_set)
        missing_index = sorted(graph_set - indexed_set)
        return ReconciliationReport(
            source_version_id=source_version_id,
            indexed_chunk_ids=sorted(indexed_set),
            indexed_clause_ids=sorted(indexed_set),
            graph_clause_ids=sorted(graph_set),
            missing_graph_clause_ids=missing_graph,
            missing_index_clause_ids=missing_index,
            healthy=not missing_graph and not missing_index,
        )

    async def _resolve(self, fetcher: Any, client: Any, source_version_id: str, *, kind: str) -> list[str]:
        if fetcher is not None:
            result = fetcher(source_version_id)
            if isinstance(result, Awaitable):
                result = await result
            return list(result)
        if client is None:
            return []
        if kind == "index":
            return self._read_index_ids(client, source_version_id)
        return self._read_graph_ids(client, source_version_id)

    def _read_index_ids(self, store: Any, source_version_id: str) -> list[str]:
        # Best-effort live read: scroll Qdrant points filtered by source version.
        try:
            points, _ = store.qdrant.scroll(
                collection_name="regulation_chunks",
                scroll_filter={
                    "must": [{"key": "source_version_id", "match": {"value": source_version_id}}]
                },
                limit=10000,
            )
            ids = []
            for p in points:
                payload = getattr(p, "payload", {}) or {}
                clause = payload.get("clause") or payload.get("chunk_id")
                if clause:
                    ids.append(str(clause))
            return ids
        except Exception:
            return []

    def _read_graph_ids(self, graph: Any, source_version_id: str) -> list[str]:
        try:
            rows = graph.run(
                "MATCH (sv:SourceVersion {id: $id})-[:CONTAINS]->(c:Clause) "
                "RETURN c.id AS id",
                {"id": source_version_id},
            )
            ids = []
            for r in rows:
                try:
                    ids.append(r["id"])
                except Exception:
                    ids.append(getattr(r, "id", ""))
            return [i for i in ids if i]
        except Exception:
            return []
