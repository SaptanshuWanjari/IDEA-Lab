import random
from collections import defaultdict
from dataclasses import dataclass, field


@dataclass
class SimulationMAP:
    id: str
    optimistic_days: int = 3
    most_likely_days: int = 7
    pessimistic_days: int = 14
    dependencies: list = field(default_factory=list)
    department: str = ""
    status: str = "Pending"
    completed: bool = False


class DigitalTwin:
    def __init__(self, maps: list[dict], iterations: int = 100):
        self.sim_maps = {
            str(m["id"]): SimulationMAP(
                id=str(m["id"]),
                optimistic_days=m.get("optimistic_days", 3),
                most_likely_days=m.get("most_likely_days", 7),
                pessimistic_days=m.get("pessimistic_days", 14),
                dependencies=m.get("dependencies", []),
                department=m.get("department", ""),
                status=m.get("status", "Pending"),
                completed=m.get("status") == "Completed",
            )
            for m in maps
        }
        self.iterations = iterations

    def simulate(self) -> dict:
        if not self.sim_maps:
            return {
                "median_completion_days": 0,
                "p90_completion_days": 0,
                "optimistic_completion_days": 0,
                "pessimistic_completion_days": 0,
                "iterations": self.iterations,
                "bottleneck_department": "Unknown",
                "bottleneck_frequency_pct": 0.0,
                "department_workloads": {},
            }

        completion_times = []
        bottlenecks = defaultdict(int)
        department_workloads = defaultdict(int)

        for _ in range(self.iterations):
            finish: dict[str, int] = {}
            remaining = set(self.sim_maps.keys())

            while remaining:
                progressed = False
                for mid in list(remaining):
                    m = self.sim_maps[mid]
                    deps = m.dependencies or []
                    if all(d in finish for d in deps):
                        start = max((finish[d] for d in deps), default=0)
                        if m.completed:
                            duration = 0
                        else:
                            duration = round(
                                random.triangular(
                                    m.optimistic_days,
                                    m.pessimistic_days,
                                    m.most_likely_days,
                                )
                            )
                        finish[mid] = start + duration
                        department_workloads[m.department] += duration
                        remaining.remove(mid)
                        progressed = True
                if not progressed:
                    raise ValueError("Dependency cycle detected")

            completion_times.append(max(finish.values()))

            # Bottleneck = department with the most work time in this run.
            dept_time = defaultdict(int)
            for mid, m in self.sim_maps.items():
                deps = m.dependencies or []
                start = max((finish[d] for d in deps), default=0)
                dept_time[m.department] += finish[mid] - start
            bottleneck = max(dept_time, key=dept_time.get) if dept_time else ""
            bottlenecks[bottleneck] += 1

        sorted_times = sorted(completion_times)
        median = sorted_times[len(sorted_times) // 2]
        p90_index = int(len(sorted_times) * 0.9)
        p90 = sorted_times[p90_index if p90_index < len(sorted_times) else -1]

        bottleneck_dept = max(bottlenecks, key=bottlenecks.get) if bottlenecks else "Unknown"
        bottleneck_pct = (bottlenecks[bottleneck_dept] / self.iterations) * 100

        return {
            "median_completion_days": median,
            "p90_completion_days": p90,
            "optimistic_completion_days": sorted_times[0],
            "pessimistic_completion_days": sorted_times[-1],
            "iterations": self.iterations,
            "bottleneck_department": bottleneck_dept,
            "bottleneck_frequency_pct": round(bottleneck_pct, 1),
            "department_workloads": dict(department_workloads),
        }

    def ripple_effect(self, delayed_map_id: str, extra_days: int) -> dict:
        mid = delayed_map_id
        if mid not in self.sim_maps:
            return {
                "base_median": 0,
                "delayed_median": 0,
                "delta_days": 0,
                "delayed_map": delayed_map_id,
                "extra_days_added": extra_days,
            }

        base = self.simulate()
        original_pessimistic = self.sim_maps[mid].pessimistic_days
        self.sim_maps[mid].pessimistic_days += extra_days
        delayed = self.simulate()
        self.sim_maps[mid].pessimistic_days = original_pessimistic

        return {
            "base_median": base["median_completion_days"],
            "delayed_median": delayed["median_completion_days"],
            "delta_days": delayed["median_completion_days"] - base["median_completion_days"],
            "delayed_map": delayed_map_id,
            "extra_days_added": extra_days,
        }
