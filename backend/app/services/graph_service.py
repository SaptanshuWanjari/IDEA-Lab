import json

import httpx

from app.config import settings
from app.graph.client import GraphClient
from app.schemas.document import DocumentStructure


RELATION_PROMPT = """You are a legal-document parser. Given the regulation title and clauses, identify directed semantic relations between clauses.

Allowed relation types: REQUIRES, AMENDS, DEFINES.

Return a JSON array of objects like:
[{{"source": "clause-id-1", "target": "clause-id-2", "type": "REQUIRES"}}]

Title: {title}
Clauses:
{clauses}

Return only the JSON array."""


class GraphService:
    def __init__(self, client: GraphClient):
        self.client = client

    def ingest_regulation(self, regulation_id: str, title: str, document: DocumentStructure):
        self.client.run(
            "MERGE (r:Regulation {id: $id}) SET r.title = $title",
            {"id": regulation_id, "title": title},
        )
        for clause in document.clauses:
            clause_id = f"{regulation_id}-{clause.id}"
            self.client.run(
                """
                MERGE (c:Clause {id: $clause_id})
                SET c.text = $text, c.section = $section, c.regulation_id = $reg_id
                MERGE (r:Regulation {id: $reg_id})-[:CONTAINS]->(c)
                """,
                {
                    "clause_id": clause_id,
                    "text": clause.text,
                    "section": clause.section,
                    "reg_id": regulation_id,
                },
            )

        relations = self._extract_relations(title, document)
        for rel in relations:
            source = f"{regulation_id}-{rel.get('source')}"
            target = f"{regulation_id}-{rel.get('target')}"
            rel_type = rel.get("type", "REQUIRES")
            if rel_type not in ("REQUIRES", "AMENDS", "DEFINES"):
                rel_type = "REQUIRES"
            self.client.run(
                f"""
                MERGE (a:Clause {{id: $source}})
                MERGE (b:Clause {{id: $target}})
                MERGE (a)-[:{rel_type}]->(b)
                """,
                {"source": source, "target": target},
            )

    def _extract_relations(self, title: str, document: DocumentStructure) -> list[dict]:
        clauses_text = "\n".join(
            f"{c.id}: {c.text}" for c in document.clauses
        )
        response = httpx.post(
            f"{settings.ollama_url.rstrip('/')}/api/chat",
            json={
                "model": settings.ollama_chat_model,
                "messages": [
                    {"role": "system", "content": "Return only a valid JSON array."},
                    {"role": "user", "content": RELATION_PROMPT.format(title=title, clauses=clauses_text)},
                ],
                "stream": False,
                "options": {"temperature": 0.0, "num_predict": 1000},
            },
            timeout=httpx.Timeout(60.0, connect=5.0),
        )
        response.raise_for_status()
        content = response.json()["message"]["content"]
        try:
            start = content.find("[")
            end = content.rfind("]") + 1
            return json.loads(content[start:end]) if start >= 0 and end > start else []
        except Exception:
            return []
