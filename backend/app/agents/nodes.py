import json

from app.agents.prompts import (
    DEPENDENCY_PROMPT,
    MAP_PROMPT,
    REQUIREMENT_PROMPT,
    UNDERSTANDING_PROMPT,
)
from app.agents.tools import query_graph, retrieve
from app.llm.client import LLMClient
from app.schemas.agent import GeneratedMAP, Requirement


class AgentNodes:
    def __init__(self, client: LLMClient):
        self.client = client

    def understanding(self, state: dict) -> dict:
        response = self.client.chat(
            [
                {"role": "system", "content": "Return only the summary and affected domains."},
                {"role": "user", "content": UNDERSTANDING_PROMPT.format(text=state["text"][:8000])},
            ]
        )
        lines = response.split("\n")
        summary_start = next((i for i, l in enumerate(lines) if l and not l.startswith("-")), 0)
        domains = [l.strip("- ") for l in lines if l.strip().startswith("-")]
        summary = "\n".join(lines[summary_start : summary_start + 5]).strip()
        return {"summary": summary, "affected_domains": domains}

    def requirements(self, state: dict) -> dict:
        clauses_text = "\n".join(
            f"{c.get('id', i)}: {c.get('text', c)}"
            for i, c in enumerate(state.get("clauses", []))
        )
        query = state.get("summary", "")[:200]
        retrieved = retrieve(query, filters={"document_type": "RBI Circular"}) if query else []
        related_clauses = "\n".join(r.get("text", "") for r in retrieved[:5])
        graph_context = ""
        if state.get("clauses"):
            first_clause = state["clauses"][0].get("id")
            if first_clause:
                graph_result = query_graph(
                    "MATCH (c:Clause {id: $id})-[:REQUIRES|:AMENDS|:DEFINES]-(r) RETURN r.text AS text LIMIT 5",
                    {"id": first_clause},
                )
                graph_context = "\n".join(r.get("text", "") for r in graph_result)

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
                        schema=Requirement.model_json_schema(),
                    ),
                },
            ]
        )
        try:
            data = json.loads(response[response.find("[") : response.rfind("]") + 1])
        except Exception:
            data = []
        return {"requirements": data}

    def generate_maps(self, state: dict) -> dict:
        req_text = json.dumps(state.get("requirements", []))
        historical = retrieve("Measurable Action Point implementation plan", filters={"document_type": "RBI Circular"})
        historical_context = "\n".join(h.get("text", "") for h in historical[:3])

        response = self.client.chat(
            [
                {"role": "system", "content": "Return only valid JSON array of MAPs."},
                {
                    "role": "user",
                    "content": MAP_PROMPT.format(
                        requirements=req_text,
                        departments="Compliance, Risk, IT, Operations, Audit",
                        historical_context=historical_context,
                        schema=GeneratedMAP.model_json_schema(),
                    ),
                },
            ]
        )
        try:
            data = json.loads(response[response.find("[") : response.rfind("]") + 1])
        except Exception:
            data = []
        return {"generated_maps": data}

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
        try:
            data = json.loads(response[response.find("{") : response.rfind("}") + 1])
        except Exception:
            data = {"dependencies": []}
        return {"dependencies": data.get("dependencies", [])}
