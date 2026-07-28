from neo4j import GraphDatabase

from app.config import settings


class GraphClient:
    def __init__(self):
        self.driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
        )

    def close(self):
        self.driver.close()

    def run(self, query: str, parameters: dict = None):
        with self.driver.session() as session:
            return list(session.run(query, parameters or {}))

    def ensure_schema(self):
        """Create constraints once at startup."""
        self.run(
            "CREATE CONSTRAINT regulation_id IF NOT EXISTS FOR (r:Regulation) REQUIRE r.id IS UNIQUE"
        )
        self.run(
            "CREATE CONSTRAINT clause_id IF NOT EXISTS FOR (c:Clause) REQUIRE c.id IS UNIQUE"
        )
        self.run(
            "CREATE CONSTRAINT map_id IF NOT EXISTS FOR (m:MAP) REQUIRE m.id IS UNIQUE"
        )
