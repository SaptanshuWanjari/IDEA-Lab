from typing import TypedDict, Any
from langgraph.graph import END, StateGraph

from app.agents.nodes import AgentNodes
from app.llm.client import LLMClient


class AgentState(TypedDict, total=False):
    regulation_id: str
    regulation_version_id: str | None
    correlation_id: str | None
    document_type: str | None
    text: str
    clauses: list
    summary: str
    affected_domains: list[str]
    requirements: list
    generated_maps: list
    dependencies: list
    raw_req_response: str
    raw_llm_response: str
    ai_runs: list


class AgentGraph:
    def __init__(self, run_recorder=None):
        self.nodes = AgentNodes(LLMClient(), run_recorder=run_recorder)
        builder = StateGraph(AgentState)
        builder.add_node("understanding", self.nodes.understanding)
        builder.add_node("requirements", self.nodes.requirements)
        builder.add_node("generate_maps", self.nodes.generate_maps)
        builder.add_node("dependencies", self.nodes.dependencies)
        builder.set_entry_point("understanding")
        builder.add_edge("understanding", "requirements")
        builder.add_edge("requirements", "generate_maps")
        builder.add_edge("generate_maps", "dependencies")
        builder.add_edge("dependencies", END)
        self.graph = builder.compile()

    def run(self, regulation_id: str, text: str, clauses: list, document_type: str | None = None) -> dict:
        return self.graph.invoke(
            {"regulation_id": regulation_id, "text": text, "clauses": clauses, "document_type": document_type}
        )
