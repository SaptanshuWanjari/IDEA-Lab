import logging
from fastapi import APIRouter, HTTPException, status

from app.dependencies import engine
from app.models.base import Base
from app.seed import seed

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/clean-db")
async def clean_database():
    """Wipes and resets PostgreSQL tables, Neo4j graph nodes, and vector collections."""
    try:
        # 1. Reset PostgreSQL tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)

        # 2. Reseed initial departments and default admin accounts
        await seed()

        # 3. Clean Neo4j graph database
        try:
            from app.graph.client import GraphClient

            graph = GraphClient()
            graph.run("MATCH (n) DETACH DELETE n")
            graph.ensure_schema()
            graph.close()
        except Exception as e:
            logger.warning("Graph cleanup notice: %s", e)

        # 4. Clean Vector store collections
        try:
            from app.config import settings
            from app.vector.client import HybridVectorStore

            store = HybridVectorStore(settings.qdrant_url)
            collections = store.qdrant.get_collections().collections
            for c in collections:
                store.qdrant.delete_collection(c.name)
        except Exception as e:
            logger.warning("Vector store cleanup notice: %s", e)

        # 5. Clean MinIO storage buckets
        try:
            from app.services.storage import StorageService

            storage = StorageService()
            for bucket in ["regulations", "evidence"]:
                if storage.client.bucket_exists(bucket):
                    objects = storage.client.list_objects(bucket, recursive=True)
                    for obj in objects:
                        storage.client.remove_object(bucket, obj.object_name)
        except Exception as e:
            logger.warning("Storage cleanup notice: %s", e)

        return {
            "status": "ok",
            "message": "Database wiped, recreated, and initial seed restored successfully.",
        }
    except Exception as e:
        logger.error("Database clean error: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database clean failed: {str(e)}",
        )
