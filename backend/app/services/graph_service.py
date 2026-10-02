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

    def ingest_regulation(
        self,
        regulation_id: str,
        title: str,
        document: DocumentStructure,
        *,
        source_version_id: str | None = None,
        bank_id: str | None = None,
        legal_entity_id: str | None = None,
        regulation_version_id: str | None = None,
        classification: str | None = None,
    ):
        # Constraint violations must surface (never swallowed): MERGE-based
        # writes are idempotent, so a constraint error indicates real
        # corruption that reconciliation must report.
        if source_version_id is not None:
            self.client.run(
                "MERGE (sv:SourceVersion {id: $id}) "
                "SET sv.regulation_id = $reg_id, sv.bank_id = $bank_id, "
                "sv.legal_entity_id = $legal_entity_id, "
                "sv.regulation_version_id = $regulation_version_id",
                {
                    "id": source_version_id,
                    "reg_id": regulation_id,
                    "bank_id": bank_id,
                    "legal_entity_id": legal_entity_id,
                    "regulation_version_id": regulation_version_id or source_version_id,
                },
            )
        else:
            self.client.run(
                "MERGE (r:Regulation {id: $id}) SET r.title = $title",
                {"id": regulation_id, "title": title},
            )
        clause_ids = {c.id for c in document.clauses}
        for clause in document.clauses:
            clause_id = f"{regulation_id}-{clause.id}"
            params = {
                "clause_id": clause_id,
                "text": clause.text,
                "section": clause.section,
                "reg_id": regulation_id,
                "bank_id": bank_id,
                "legal_entity_id": legal_entity_id,
                "regulation_version_id": regulation_version_id or source_version_id,
                "classification": classification,
                "source_version_id": source_version_id,
            }
            if source_version_id is not None:
                self.client.run(
                    """
                    MATCH (sv:SourceVersion {id: $source_version_id})
                    MERGE (c:Clause {id: $clause_id})
                    SET c.text = $text, c.section = $section, c.regulation_id = $reg_id,
                        c.bank_id = $bank_id, c.legal_entity_id = $legal_entity_id,
                        c.regulation_version_id = $regulation_version_id,
                        c.classification = $classification,
                        c.source_version_id = $source_version_id
                    MERGE (sv)-[:CONTAINS]->(c)
                    """,
                    params,
                )
            else:
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
        # MATCH both endpoints first: never fabricate phantom Clause nodes
        # via bare MERGE, and never swallow constraint errors.
        queries = {
            "REQUIRES": "MATCH (a:Clause {id: $source}) MATCH (b:Clause {id: $target}) MERGE (a)-[:REQUIRES]->(b)",
            "AMENDS": "MATCH (a:Clause {id: $source}) MATCH (b:Clause {id: $target}) MERGE (a)-[:AMENDS]->(b)",
            "DEFINES": "MATCH (a:Clause {id: $source}) MATCH (b:Clause {id: $target}) MERGE (a)-[:DEFINES]->(b)",
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
