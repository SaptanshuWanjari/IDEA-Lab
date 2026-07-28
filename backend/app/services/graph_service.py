from app.graph.client import GraphClient
from app.schemas.document import DocumentStructure


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
