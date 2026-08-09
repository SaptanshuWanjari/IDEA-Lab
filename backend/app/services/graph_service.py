import json
import logging
import re
from typing import Literal

from app.config import settings
from app.graph.client import GraphClient
from app.llm.client import LLMClient
from app.schemas.document import DocumentStructure

logger = logging.getLogger(__name__)

RelationType = Literal["REQUIRES", "AMENDS", "DEFINES"]
VALID_RELATIONS = {"REQUIRES", "AMENDS", "DEFINES"}

_RELATION_EXAMPLE = json.dumps([{"source": "clause-id-1", "target": "clause-id-2", "type": "REQUIRES"}])

RELATION_PROMPT = f"""You are a legal-document parser. Given the regulation title and clauses, identify directed semantic relations between clauses.

Allowed relation types: REQUIRES, AMENDS, DEFINES.

Return a JSON array of objects like:
{_RELATION_EXAMPLE}

Title: {{title}}
Clauses:
{{clauses}}

Return only the JSON array."""


class GraphService:
    def __init__(self, client: GraphClient):
        self.client = client

    def ingest_regulation(self, regulation_id: str, title: str, document: DocumentStructure):
        try:
            self.client.run(
                "MERGE (r:Regulation {id: $id}) SET r.title = $title",
                {"id": regulation_id, "title": title},
            )
        except Exception as e:
            if "already exists" in str(e):
                logger.info("Regulation %s already in graph, skipping ingest", regulation_id)
                return
            raise
        clause_ids = {c.id for c in document.clauses}
        for clause in document.clauses:
            clause_id = f"{regulation_id}-{clause.id}"
            try:
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
            except Exception as e:
                if "already exists" in str(e):
                    logger.info("Clause %s already in graph, continuing", clause_id)
                    continue
                raise

        try:
            relations = self._extract_relations(title, document)
        except Exception as e:
            logger.warning("Relation extraction failed for regulation %s: %s", regulation_id, e)
            relations = []

        for rel in relations:
            source_id = rel.get("source")
            target_id = rel.get("target")
            rel_type = rel.get("type", "REQUIRES")
            if source_id not in clause_ids or target_id not in clause_ids:
                continue
            if rel_type not in VALID_RELATIONS:
                continue
            source = f"{regulation_id}-{source_id}"
            target = f"{regulation_id}-{target_id}"
            self._write_relation(source, target, rel_type)

    def _write_relation(self, source: str, target: str, rel_type: RelationType):
        queries = {
            "REQUIRES": "MERGE (a:Clause {id: $source}) MERGE (b:Clause {id: $target}) MERGE (a)-[:REQUIRES]->(b)",
            "AMENDS": "MERGE (a:Clause {id: $source}) MERGE (b:Clause {id: $target}) MERGE (a)-[:AMENDS]->(b)",
            "DEFINES": "MERGE (a:Clause {id: $source}) MERGE (b:Clause {id: $target}) MERGE (a)-[:DEFINES]->(b)",
        }
        self.client.run(queries[rel_type], {"source": source, "target": target})

    def _extract_relations(self, title: str, document: DocumentStructure) -> list[dict]:
        if not document.clauses:
            return []

        clauses_text = "\n".join(f"{c.id}: {c.text}" for c in document.clauses)
        llm = LLMClient()
        response = llm.chat(
            [
                {"role": "system", "content": "Return only a valid JSON array."},
                {"role": "user", "content": RELATION_PROMPT.replace("{title}", title).replace("{clauses}", clauses_text)},
            ],
            temperature=0.0,
            max_tokens=settings.ollama_relation_max_tokens,
        )
        return self._parse_relations(response)

    def _parse_relations(self, content: str) -> list[dict]:
        match = re.search(r"\[.*\]", content, re.DOTALL)
        if not match:
            return []
        try:
            data = json.loads(match.group(0))
            if not isinstance(data, list):
                return []
            return [r for r in data if isinstance(r, dict)]
        except Exception:
            logger.warning("Failed to parse relations JSON: %s", content[:200])
            return []
