from datetime import datetime, timedelta, timezone
from typing import List
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.department import Department
from app.models.map import MAP
from app.models.map_dependency import MapDependency
from app.schemas.agent import GeneratedMAP


class MapEngine:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def from_agent_output(self, regulation_id: str, generated: List[GeneratedMAP]) -> List[MAP]:
        maps = []
        for g in generated:
            result = await self.session.execute(select(Department).where(Department.name == g.owner_department))
            dept = result.scalar_one_or_none()
            if not dept:
                continue
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
                    source_clauses=g.source_clauses,
                )
            )
        return maps

    async def save_draft(
        self, regulation_id: str, generated: List[dict], dependencies: List[dict]
    ) -> List[MAP]:
        generated_maps = [GeneratedMAP(**g) for g in generated]
        maps = await self.from_agent_output(regulation_id, generated_maps)
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
