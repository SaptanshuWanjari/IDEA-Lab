from collections import deque
from typing import Any
from uuid import UUID


class DependencyGraph:
    def __init__(self, maps: list[Any], dependencies: list[Any]):
        self._map_ids = {m.id for m in maps}
        self._deps: list[tuple[UUID, UUID]] = []
        for d in dependencies:
            if hasattr(d, "map_id"):
                map_id = d.map_id
                dep_id = d.depends_on_map_id
            else:
                map_id = d.get("map_id")
                dep_id = d.get("depends_on_map_id")
            if map_id in self._map_ids and dep_id in self._map_ids:
                self._deps.append((dep_id, map_id))
        self._days = {m.id: getattr(m, "estimated_days", None) or 7 for m in maps}

    def edges(self) -> list[dict]:
        return [{"source": str(s), "target": str(t)} for s, t in self._deps]

    def topological_order(self) -> list[UUID]:
        in_degree = {m: 0 for m in self._map_ids}
        adj = {m: [] for m in self._map_ids}
        for s, t in self._deps:
            adj[s].append(t)
            in_degree[t] += 1
        queue = deque([m for m in self._map_ids if in_degree[m] == 0])
        order = []
        while queue:
            node = queue.popleft()
            order.append(node)
            for nxt in adj[node]:
                in_degree[nxt] -= 1
                if in_degree[nxt] == 0:
                    queue.append(nxt)
        if len(order) != len(self._map_ids):
            raise ValueError("Dependency cycle detected")
        return order

    def critical_path(self) -> list[UUID]:
        order = self.topological_order()
        dist = {m: self._days.get(m, 7) for m in self._map_ids}
        prev = {m: None for m in self._map_ids}
        adj = {m: [] for m in self._map_ids}
        for s, t in self._deps:
            adj[s].append(t)
        for node in order:
            for nxt in adj[node]:
                candidate = dist[node] + self._days.get(nxt, 7)
                if candidate > dist[nxt]:
                    dist[nxt] = candidate
                    prev[nxt] = node
        end = max(self._map_ids, key=lambda m: dist[m])
        path = []
        while end is not None:
            path.append(end)
            end = prev[end]
        return list(reversed(path))

    def blocking_map(self, map_id: UUID) -> dict:
        blocks = []
        blocked_by = []
        for s, t in self._deps:
            if s == map_id:
                blocks.append(t)
            if t == map_id:
                blocked_by.append(s)
        return {"blocks": blocks, "blocked_by": blocked_by}
