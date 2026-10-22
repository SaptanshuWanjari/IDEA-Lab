import json
import logging
import re
from typing import Optional

from app.agents.prompts import (
    DEPENDENCY_PROMPT,
    MAP_PROMPT,
    REQUIREMENT_PROMPT,
    UNDERSTANDING_PROMPT,
)
from app.agents.tools import query_graph, retrieve
from app.llm.client import LLMClient, record_ai_run
from app.schemas.agent import GeneratedMAP, Requirement
from app.services.ingestion import ROLES, SYSTEMS

_json_log = logging.getLogger(__name__)


def _calculate_confidence(clause_match: bool, deadline_match: bool, entity_overlap: float) -> float:
    """Heuristic confidence: 0.7 base + 0.1 per match + 0.1 * entity_overlap."""
    base = 0.7
    score = base
    if clause_match:
        score += 0.1
    if deadline_match:
        score += 0.1
    score += 0.1 * entity_overlap
    return round(min(max(score, 0.5), 1.0), 2)


def _derive_estimated_days(deadline_days: Optional[int]) -> int:
    """Derive estimated_days as 70% of deadline, minimum 1, default 7."""
    if deadline_days is None or deadline_days <= 0:
        return 7
    return max(1, int(deadline_days * 0.7))


# Prompt template versions pinned for AI run provenance (Task 10). Bump the
# version string whenever the corresponding template text changes.
PROMPT_VERSIONS = {
    "understanding": "understanding_prompt/v1",
    "requirements": "requirement_prompt/v1",
    "generate_maps": "map_prompt/v1",
    "dependencies": "dependency_prompt/v1",
}


def _model_id(client) -> str:
    model = getattr(client, "model", None)
    return model if isinstance(model, str) and model else "unknown"


def _chunk_ids(results) -> list[str]:
    ids = []
    for i, hit in enumerate(results or []):
        if isinstance(hit, dict):
            ids.append(str(hit.get("chunk_id") or hit.get("id") or f"hit-{i}"))
        else:
            ids.append(str(getattr(hit, "chunk_id", None) or f"hit-{i}"))
    return ids


def _remove_trailing_commas(text: str) -> str:
    """Remove trailing commas before } or ] that LLMs commonly emit."""
    in_string = False
    escape = False
    chars = []
    for i, ch in enumerate(text):
        if escape:
            chars.append(ch)
            escape = False
            continue
        if ch == "\\":
            chars.append(ch)
            escape = True
            continue
        if ch == '"':
            in_string = not in_string
            chars.append(ch)
            continue
        if not in_string and ch == ",":
            j = i + 1
            while j < len(text) and text[j].isspace():
                j += 1
            if j < len(text) and text[j] in "}]":
                continue
        chars.append(ch)
    return "".join(chars)


def _extract_json(text: str, default: list | dict = None) -> list | dict:
    if default is None:
        default = []

    # Strip markdown code fences (case-insensitive language tag)
    cleaned = text.strip()
    if cleaned.startswith("```"):
        first_newline = cleaned.find("\n")
        if first_newline != -1:
            cleaned = cleaned[first_newline + 1 :]
        cleaned = cleaned.rstrip().removesuffix("```").strip()

    # Direct parse
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        _json_log.debug("_extract_json direct parse failed: %s", e)

    # Repair common LLM JSON defects and reparse
    repaired = _remove_trailing_commas(cleaned)
    try:
        return json.loads(repaired)
    except json.JSONDecodeError as e:
        _json_log.debug("_extract_json repaired parse failed: %s", e)

    # Extract the first self-contained JSON value, ignoring surrounding prose
    for starter, ender in (("[", "]"), ("{", "}")):
        idx = cleaned.find(starter)
        while idx != -1:
            try:
                parsed, _ = json.JSONDecoder().raw_decode(cleaned, idx)
                return parsed
            except json.JSONDecodeError:
                idx = cleaned.find(starter, idx + 1)

    _json_log.warning("_extract_json could not parse response (len=%d): %s", len(text), text[:500])
    return default


class AgentNodes:
    def __init__(self, client: LLMClient, run_recorder=None):
        self.client = client
        # In-memory provenance of every LLM stage executed by this node set.
        # Optional run_recorder(run) hook lets callers persist each AIRun.
        self.runs: list = []
        self.run_recorder = run_recorder

    def _record(self, run):
        self.runs.append(run)
        if self.run_recorder is not None:
            try:
                self.run_recorder(run)
            except Exception:
                _json_log.warning("run_recorder failed for stage %s", run.stage)
        return run

    def understanding(self, state: dict) -> dict:
        response = self.client.chat(
            [
                {"role": "system", "content": "Return only the summary and affected domains."},
                {"role": "user", "content": UNDERSTANDING_PROMPT.format(text=state["text"][:8000])},
            ]
        )
        if not response or not response.strip():
            _json_log.warning("understanding node got empty response, using raw text fallback")
            return {
                "summary": state["text"][:500],
                "affected_domains": ["Compliance", "Risk", "IT", "Operations"],
            }
        lines = response.split("\n")
        summary_start = next((i for i, l in enumerate(lines) if l and not l.startswith("-")), 0)
        domains = [l.strip("- ") for l in lines if l.strip().startswith("-")]
        summary = "\n".join(lines[summary_start : summary_start + 5]).strip()
        if not summary:
            summary = state["text"][:500]
        if not domains:
            domains = ["Compliance", "Risk", "IT", "Operations"]
        return {"summary": summary, "affected_domains": domains}

    def requirements(self, state: dict) -> dict:
        clauses_text = "\n".join(
            f"{c.get('id', i)}: {c.get('text', c)}"
            for i, c in enumerate(state.get("clauses", []))
        )
        raw_query = state.get("summary", "")[:200]
        query = re.sub(r'[^\w\s]', ' ', raw_query).strip()
        filters = {"document_type": state["document_type"]} if state.get("document_type") else {}
        retrieved = retrieve(query, filters=filters) if query else []
        related_clauses = "\n".join(r.get("text", "") for r in retrieved[:5])
        graph_context = ""
        regulation_id = state.get("regulation_id")
        if state.get("clauses") and regulation_id:
            seen_texts = set()
            graph_parts = []
            for clause in state["clauses"][:20]:
                clause_id = clause.get("id")
                if not clause_id:
                    continue
                full_clause_id = f"{regulation_id}-{clause_id}"
                graph_result = query_graph(
                    "MATCH (c:Clause {id: $id})-[:REQUIRES|AMENDS|DEFINES]-(r) RETURN r.text AS text LIMIT 5",
                    {"id": full_clause_id},
                )
                for r in graph_result:
                    text = r.get("text", "")
                    if text and text not in seen_texts:
                        seen_texts.add(text)
                        graph_parts.append(text)
            graph_context = "\n".join(graph_parts)

        context = f"Retrieved context:\n{related_clauses}\n\nGraph context:\n{graph_context}".strip()

        response = self.client.chat(
            [
                {"role": "system", "content": "Return only valid JSON."},
                {
                    "role": "user",
                    "content": REQUIREMENT_PROMPT.format(
                        summary=state.get("summary", ""),
                        clauses=clauses_text,
                        context=context,
                        schema=json.dumps(Requirement.model_json_schema(), indent=2),
                    ),
                },
            ]
        )
        _json_log.debug("REQ LLM RESPONSE (len=%d): %s", len(response), response[:200])
        return {"requirements": _extract_json(response, default=[]), "raw_req_response": response}

    def generate_maps(self, state: dict) -> dict:
        req_text = json.dumps(state.get("requirements", []))
        filters = {"document_type": state["document_type"]} if state.get("document_type") else {}
        historical = retrieve("Measurable Action Point implementation plan", filters=filters)
        historical_context = "\n".join(h.get("text", "") for h in historical[:3])
        chunk_ids = _chunk_ids(historical)

        # Extract deadline entities from clauses for deadline preservation validation
        deadline_entities = []
        for clause in state.get("clauses", []):
            if isinstance(clause, dict):
                text = clause.get("text", "")
                # Find deadline patterns in clause text
                deadline_matches = re.findall(r"(?:within|by)\s+(\d+)\s+(days?|months?|years?)", text, re.IGNORECASE)
                for match in deadline_matches:
                    deadline_entities.append(f"{match[0]} {match[1]}")
                deadline_matches = re.findall(r"for\s+a\s+minimum\s+period\s+of\s+(\d+)\s+(days?|months?|years?)", text, re.IGNORECASE)
                for match in deadline_matches:
                    deadline_entities.append(f"{match[0]} {match[1]}")
                deadline_matches = re.findall(r"for\s+at\s+least\s+(\d+)\s+(days?|months?|years?)", text, re.IGNORECASE)
                for match in deadline_matches:
                    deadline_entities.append(f"{match[0]} {match[1]}")
        deadline_entities = list(set(deadline_entities))  # deduplicate
        deadline_entities_str = ", ".join(deadline_entities) if deadline_entities else "none found"

        user_prompt = MAP_PROMPT.format(
            requirements=req_text,
            historical_context=historical_context,
            schema=json.dumps(GeneratedMAP.model_json_schema(), indent=2),
            deadline_entities=deadline_entities_str,
        )

        response = self.client.chat(
            [
                {
                    "role": "system",
                    "content": (
                        "Return only a valid JSON array of MAPs. "
                        "owner_department MUST be one of: Compliance, Risk, IT, Operations, Audit. "
                        "No other department names are allowed."
                    ),
                },
                {
                    "role": "user",
                    "content": user_prompt,
                },
            ]
        )
        _json_log.debug("MAPS LLM RESPONSE (len=%d): %s", len(response), response[:300])
        parsed = _extract_json(response, default=[])

        # Robust unwrap if LLM returned {"maps": [...]} instead of [...]
        if isinstance(parsed, dict):
            if len(parsed) == 1 and isinstance(list(parsed.values())[0], list):
                parsed = list(parsed.values())[0]
            else:
                parsed = [parsed]

        # Deadline validation: cross-reference MAP deadlines against extracted entities
        if deadline_entities:
            validated_maps = []
            # Prepare entity days for deadline matching
            entity_days = set()
            for de in deadline_entities:
                match = re.search(r"(\d+)\s*(days?|months?|years?)", de, re.IGNORECASE)
                if match:
                    num, unit = int(match.group(1)), match.group(2).lower()
                    if "day" in unit:
                        entity_days.add(num)
                    elif "month" in unit:
                        entity_days.add(num * 30)
                    elif "year" in unit:
                        entity_days.add(num * 365)

            # Prepare clause entities for overlap calculation
            clause_entities = set()
            for clause in state.get("clauses", []):
                if isinstance(clause, dict):
                    text = clause.get("text", "")
                    # Extract role and system entities
                    for role in ROLES:
                        if re.search(r"\b" + re.escape(role) + r"\b", text, re.IGNORECASE):
                            clause_entities.add(role.lower())
                    for system in SYSTEMS:
                        if re.search(r"\b" + re.escape(system) + r"\b", text, re.IGNORECASE):
                            clause_entities.add(system.lower())

            valid_clause_ids = set(c.get("id") for c in state.get("clauses", []) if isinstance(c, dict))

            for m in parsed:
                if isinstance(m, dict):
                    dl = m.get("deadline_days")
                    if dl is not None:
                        if dl not in entity_days and entity_days:
                            m["deadline_warning"] = f"Deadline {dl} days not found in source entities: {sorted(entity_days)}"

                    # Calculate confidence heuristic
                    clause_match = m.get("source_clause_id") in valid_clause_ids or any(
                        sc in valid_clause_ids for sc in m.get("source_clauses", [])
                    )
                    deadline_match = dl in entity_days if dl is not None else False

                    # Calculate entity overlap
                    map_entities = set()
                    for entity in m.get("entities", []):
                        if isinstance(entity, str):
                            map_entities.add(entity.lower())
                    entity_overlap = len(map_entities & clause_entities) / max(len(map_entities), 1) if map_entities else 0.0

                    m["confidence"] = _calculate_confidence(clause_match, deadline_match, entity_overlap)
                    m["estimated_days"] = _derive_estimated_days(dl)
                validated_maps.append(m)
            parsed = validated_maps

        _json_log.debug("MAPS PARSED: %d items", len(parsed))
        # Task 10 provenance: every generate_maps LLM call records model,
        # prompt version, input/output hashes, retrieval chunk IDs and the
        # parse-validator outcome. Human review happens downstream, so the
        # run starts life as pending_review.
        run = self._record(
            record_ai_run(
                stage="generate_maps",
                model_id=_model_id(self.client),
                prompt_version=PROMPT_VERSIONS["generate_maps"],
                input_text=user_prompt,
                output_text=response,
                retrieval_chunk_ids=chunk_ids,
                retrieval_manifest={"query": "Measurable Action Point implementation plan"},
                validator_result={"parsed": len(parsed) if isinstance(parsed, list) else 0,
                                  "accepted": isinstance(parsed, list)},
                reviewer_outcome="pending_review",
                correlation_id=state.get("correlation_id"),
                regulation_version_id=state.get("regulation_version_id") or state.get("regulation_id"),
            )
        )
        return {"generated_maps": parsed, "raw_llm_response": response, "ai_runs": [run.to_dict()]}

    def validate_obligations(self, state: dict) -> dict:
        """Task 7: validate LLM-extracted obligation candidates against the
        canonical document. Accepted candidates become draft obligations;
        rejected ones persist only as review errors, never as approved
        obligations."""
        from app.schemas.obligation import ObligationCandidate
        from app.services.citation_validator import CanonicalDocument, validate_candidate

        clauses = state.get("clauses", [])
        pages = state.get("pages") or {}
        if not pages:
            # Rebuild a sparse page map from clause page annotations.
            for c in clauses:
                if isinstance(c, dict) and c.get("page") is not None and c.get("text"):
                    pages.setdefault(c["page"], "")
            for c in clauses:
                if isinstance(c, dict) and c.get("page") in pages and c.get("text"):
                    pages[c["page"]] += (" " + str(c["text"]))
        document = CanonicalDocument(
            source_version_id=str(state.get("regulation_id", "unknown")),
            pages={int(k): str(v) for k, v in pages.items()},
            clauses={
                str(c.get("id", i)): {"text": str(c.get("text", "")), "page": c.get("page")}
                for i, c in enumerate(clauses)
                if isinstance(c, dict)
            },
        )
        obligations: list = []
        review_errors: list = []
        for raw in state.get("requirements", []):
            if not isinstance(raw, dict):
                continue
            try:
                candidate = ObligationCandidate(
                    clause_id=str(raw.get("clause_id", "")),
                    quote=str(raw.get("quote", raw.get("obligation", ""))),
                    page=raw.get("page"),
                    obligation_text=str(raw.get("obligation", "")),
                )
            except Exception as e:  # malformed model output -> review error
                review_errors.append({"raw": raw, "reasons": [f"malformed candidate: {e}"]})
                continue
            result = validate_candidate(candidate, document)
            if result.accepted:
                obligations.append(candidate.model_dump())
            else:
                review_errors.append(
                    {"candidate": candidate.model_dump(), "reasons": result.reasons}
                )
        return {"obligations": obligations, "obligation_review_errors": review_errors}

    def dependencies(self, state: dict) -> dict:
        maps_text = json.dumps(
            [
                {"index": i, "description": m.get("description", "")}
                for i, m in enumerate(state.get("generated_maps", []))
            ]
        )
        response = self.client.chat(
            [
                {"role": "system", "content": "Return only valid JSON."},
                {"role": "user", "content": DEPENDENCY_PROMPT.format(maps=maps_text)},
            ]
        )
        data = _extract_json(response, default={"dependencies": []})
        return {"dependencies": data.get("dependencies", []) if isinstance(data, dict) else []}
