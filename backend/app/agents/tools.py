from app.config import settings
from app.graph.client import GraphClient
from app.services.retrieval import RetrievalService
from app.vector.client import HybridVectorStore

_vector_store = None
_retrieval_service = None
_graph_client = None


def _get_retrieval_service() -> RetrievalService:
    global _vector_store, _retrieval_service
    if _retrieval_service is None:
        _vector_store = HybridVectorStore(settings.qdrant_url)
        _retrieval_service = RetrievalService(_vector_store, GraphClient())
    return _retrieval_service


def _get_graph_client() -> GraphClient:
    global _graph_client
    if _graph_client is None:
        _graph_client = GraphClient()
    return _graph_client


def retrieve(query: str, filters: dict = None) -> list[dict]:
    """Hybrid retrieval: dense + BM25 + rerank + KG expansion."""
    service = _get_retrieval_service()
    results = service.search(query, **(filters or {}))
    return [
        {
            "id": r.get("id") or r.get("chunk_id"),
            "text": r.get("text", ""),
            "score": r.get("rerank_score", r.get("score", 0.0)),
        }
        for r in results
    ]


def query_graph(cypher: str, params: dict = None) -> list[dict]:
    """Read-only Cypher query against Neo4j."""
    client = _get_graph_client()
    result = client.run(cypher, params or {})
    return [dict(r) for r in result]
