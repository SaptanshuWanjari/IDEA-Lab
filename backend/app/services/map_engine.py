from datetime import datetime, timedelta, timezone
from typing import List
from uuid import UUID

import logging

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.department import Department
from app.models.map import MAP
from app.models.map_dependency import MapDependency
from app.schemas.agent import GeneratedMAP


_map_log = logging.getLogger(__name__)

_VALID_DEPARTMENTS = {"Compliance", "Risk", "IT", "Operations", "Audit"}


class MapEngine:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def from_agent_output(
        self, regulation_id: str, generated: List[GeneratedMAP], valid_clause_ids: list[str] | None = None
    ) -> List[MAP]:
        maps = []
        for g in generated:
            if g.owner_department not in _VALID_DEPARTMENTS:
                _map_log.warning(
                    "LLM used invalid department '%s' (prompt constraint violated) — skipping MAP. "
                    "Valid: %s", g.owner_department, _VALID_DEPARTMENTS,
                )
                continue
            result = await self.session.execute(
                select(Department).where(func.lower(Department.name) == func.lower(g.owner_department))
            )
            dept = result.scalar_one_or_none()
            if not dept:
                _map_log.error("Department '%s' not seeded in DB — skipping MAP", g.owner_department)
                continue

            source_clauses = g.source_clauses
            if valid_clause_ids is not None:
                original = source_clauses or []
                filtered = [c for c in original if c in valid_clause_ids]
                for clause_id in original:
                    if clause_id not in valid_clause_ids:
                        _map_log.warning(
                            "MAP references unknown clause '%s' — dropping from source_clauses", clause_id
                        )
                if not filtered:
                    if original:
                        _map_log.warning(
                            "MAP has no valid source_clauses after traceability validation — skipping"
                        )
                        continue
                    _map_log.info(
                        "MAP has no source_clauses; traceability validation skipped (empty source allowed)"
                    )
                source_clauses = filtered

            maps.append(
                MAP(
                    regulation_id=UUID(regulation_id),
                    owner_department_id=dept.id,
                    description=g.description,
                    deadline=datetime.now(timezone.utc) + timedelta(days=g.deadline_days) if g.deadline_days else None,
                    evidence_required=g.evidence_required,
                    status="Pending",
                    approval_state="Draft",
                    confidence=g.confidence,
                    reasoning=g.reasoning,
                    source_clauses=source_clauses,
                )
            )
        return maps

    async def save_draft(
        self,
        regulation_id: str,
        generated: List[dict],
        dependencies: List[dict],
        valid_clause_ids: list[str] | None = None,
    ) -> List[MAP]:
        from pydantic import ValidationError
        generated_maps = []
        for g in generated:
            try:
                generated_maps.append(GeneratedMAP(**g))
            except ValidationError as e:
                _map_log.warning(
                    "Skipping MAP with invalid fields (owner_department must be one of Compliance/Risk/IT/Operations/Audit): %s",
                    e,
                )
        maps = await self.from_agent_output(regulation_id, generated_maps, valid_clause_ids)
        for m in maps:
            self.session.add(m)
        await self.session.flush()  # get IDs assigned

        # Validate dependency edges for cycles before persisting them
        edges: List[tuple[UUID, UUID]] = []
        for dep in dependencies:
            map_idx = dep.get("map_index")
            dep_indices = dep.get("depends_on_indices", [])
            if map_idx is None or map_idx >= len(maps):
                continue
            target = maps[map_idx]
            for di in dep_indices:
                if di < len(maps):
                    edges.append((target.id, maps[di].id))
        if self.detect_cycle(edges):
            await self.session.rollback()
            raise ValueError("Cycle detected in MAP dependencies")

        for dep in dependencies:
            map_idx = dep.get("map_index")
            dep_indices = dep.get("depends_on_indices", [])
            if map_idx is None or map_idx >= len(maps):
                continue
            target = maps[map_idx]
            for di in dep_indices:
                if di < len(maps):
                    self.session.add(MapDependency(map_id=target.id, depends_on_map_id=maps[di].id))
        await self.session.commit()
        for m in maps:
            await self.session.refresh(m)
        return maps

    async def approve(self, map_id: str) -> MAP:
        m = await self.session.get(MAP, map_id)
        if not m:
            raise ValueError("MAP not found")
        m.approval_state = "Approved"
        m.status = "Pending"
        await self.session.commit()
        return m

    def detect_cycle(self, dependencies: List[tuple[UUID, UUID]]) -> bool:
        graph = {}
        for src, dst in dependencies:
            graph.setdefault(src, set()).add(dst)
        visited = set()
        rec_stack = set()

        def dfs(node):
            visited.add(node)
            rec_stack.add(node)
            for neighbor in graph.get(node, set()):
                if neighbor not in visited:
                    if dfs(neighbor):
                        return True
                elif neighbor in rec_stack:
                    return True
            rec_stack.remove(node)
            return False

        return any(dfs(node) for node in graph)
