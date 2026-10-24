import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_session
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/clean-db")
async def clean_database(
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """Cleans generated policies, MAP tasks, evidence, audit logs, and downstream graph traces.

    Preserves:
    - User accounts and active auth sessions (caller remains logged in)
    - Banks, legal entities, departments, memberships, and role assignments
    - Registered RBI circulars, versions, and ingested PDF files

    Wipes:
    - Generated policies and MAP tasks (maps, map_dependencies, map_plans, map_plan_items)
    - Obligations ledger
    - Uploaded task evidence and evidence assessments (database and MinIO 'evidence' bucket)
    - Report snapshots, AI runs, audit logs, job history, and document artifacts
    - Neo4j MAP policy nodes and execution relations
    - Resets regulation statuses back to 'Active'
    """
    try:
        # 1. Reset PostgreSQL generated / execution data
        # Truncate tables with CASCADE to preserve foreign key integrity
        cleanup_tables = [
            "map_dependencies",
            "map_plan_items",
            "map_plans",
            "evidence_assessments",
            "evidence",
            "report_snapshots",
            "maps",
            "obligations",
            "audit_log",
            "jobs",
            "ai_runs",
            "document_artifacts",
        ]

        truncate_query = text(
            f"TRUNCATE TABLE {', '.join(cleanup_tables)} RESTART IDENTITY CASCADE;"
        )
        await session.execute(truncate_query)

        # Reset regulation status back to 'Active'
        await session.execute(text("UPDATE regulations SET status = 'Active';"))
        await session.commit()

        # 2. Clean Neo4j graph database: remove generated MAP policy nodes and relations
        try:
            from app.graph.client import GraphClient

            graph = GraphClient()
            graph.run("MATCH (m:MAP) DETACH DELETE m")
            graph.close()
        except Exception as e:
            logger.warning("Graph MAP cleanup notice: %s", e)

        # 3. Clean MinIO evidence bucket only (keep regulations bucket intact)
        try:
            from app.services.storage import StorageService

            storage = StorageService()
            if storage.client.bucket_exists("evidence"):
                objects = storage.client.list_objects("evidence", recursive=True)
                for obj in objects:
                    storage.client.remove_object("evidence", obj.object_name)
        except Exception as e:
            logger.warning("Storage evidence cleanup notice: %s", e)

        return {
            "status": "ok",
            "message": "Generated policies, MAP tasks, evidence, and audit logs cleared. Ingested circulars and bank documents preserved.",
        }
    except Exception as e:
        logger.error("Database clean error: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database clean failed: {str(e)}",
        )

