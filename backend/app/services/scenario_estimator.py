"""Implementation Scenario Estimator for the single-bank pilot.

Wraps the Monte Carlo digital twin with pilot safeguards: reproducible seed,
input snapshot ID, data-completeness accounting, capacity/calendar/dependency-wait
inputs, and an explicit calibrated/uncalibrated gate. The label "calibrated"
is prohibited until a historical backtest threshold is met.
"""

from __future__ import annotations

import hashlib
import json
import random
from collections import defaultdict
from dataclasses import dataclass, field

CALIBRATION_MIN_HISTORY = 30
BACKTEST_MAPE_THRESHOLD = 0.25
DEFAULT_ITERATIONS = 200


@dataclass(frozen=True)
class HistoryPoint:
    predicted_days: float
    actual_days: float


@dataclass(frozen=True)
class ScenarioResult:
    calibrated: bool
    label: str
    estimate_range: tuple[int, int]
    median_days: int
    seed: int
    input_snapshot_id: str
    data_completeness: float
    data_quality_notes: tuple[str, ...] = ()
    iterations: int = DEFAULT_ITERATIONS


def _snapshot_id(maps: list[dict], seed: int) -> str:
    payload = json.dumps({"maps": maps, "seed": seed}, sort_keys=True, default=str)
    return "snap-" + hashlib.sha256(payload.encode()).hexdigest()[:12]


def _backtest_mape(history: list[HistoryPoint] | list[dict]) -> float:
    errors: list[float] = []
    for point in history:
        if isinstance(point, dict):
            pred, actual = point.get("predicted_days", 0), point.get("actual_days", 0)
        else:
            pred, actual = point.predicted_days, point.actual_days
        if not actual:
            continue
        errors.append(abs(float(pred) - float(actual)) / abs(float(actual)))
    if not errors:
        return float("inf")
    return sum(errors) / len(errors)


class ScenarioEstimator:
    """Seeded scenario estimator over MAP durations.

    maps entries accept: id, optimistic_days, most_likely_days,
    pessimistic_days, estimated_days (fallback), dependencies, department,
    status, capacity_per_day, calendar_available_days, dependency_wait_days,
    actual_days (collected actuals, excluded from the forward estimate).
    """

    def __init__(
        self,
        maps: list[dict],
        history: list[HistoryPoint] | list[dict] | None = None,
        iterations: int = DEFAULT_ITERATIONS,
        calibration_min_history: int = CALIBRATION_MIN_HISTORY,
    ) -> None:
        self.maps = list(maps or [])
        self.history = list(history or [])
        self.iterations = iterations
        self.calibration_min_history = calibration_min_history

    def run(self, seed: int = 42, input_snapshot_id: str | None = None) -> ScenarioResult:
        rng = random.Random(seed)
        notes: list[str] = []

        if not self.history:
            notes.append("missing historical actuals: estimate is uncalibrated")
        elif len(self.history) < self.calibration_min_history:
            notes.append(
                f"insufficient historical actuals: {len(self.history)}/"
                f"{self.calibration_min_history} required for calibration"
            )

        completeness = self._data_completeness(notes)

        if self.maps:
            durations = self._simulate_durations(rng)
        else:
            durations = [0]
        ordered = sorted(durations)
        median = ordered[len(ordered) // 2]
        estimate_range = (ordered[0], ordered[-1])

        calibrated = False
        if len(self.history) >= self.calibration_min_history:
            mape = _backtest_mape(self.history)
            if mape <= BACKTEST_MAPE_THRESHOLD:
                calibrated = True
            else:
                notes.append(
                    f"backtest error {mape:.2f} exceeds threshold "
                    f"{BACKTEST_MAPE_THRESHOLD:.2f}: estimate remains uncalibrated"
                )
        if not calibrated and not notes:
            notes.append("estimate is uncalibrated pending backtest")

        label = (
            "Implementation Scenario Estimate (calibrated)"
            if calibrated
            else "Implementation Scenario Estimate (uncalibrated)"
        )
        return ScenarioResult(
            calibrated=calibrated,
            label=label,
            estimate_range=(int(estimate_range[0]), int(estimate_range[1])),
            median_days=int(median),
            seed=seed,
            input_snapshot_id=input_snapshot_id or _snapshot_id(self.maps, seed),
            data_completeness=completeness,
            data_quality_notes=tuple(notes),
            iterations=self.iterations,
        )

    def _data_completeness(self, notes: list[str]) -> float:
        if not self.maps:
            notes.append("no MAP inputs provided")
            return 0.0
        required = ("optimistic_days", "most_likely_days", "pessimistic_days")
        scored = 0
        for m in self.maps:
            if any(k in m for k in required) or "estimated_days" in m:
                scored += 1
            if "capacity_per_day" not in m:
                pass  # optional; tracked in notes once
        if any("capacity_per_day" not in m for m in self.maps):
            notes.append("capacity data incomplete: using default throughput")
        if any("calendar_available_days" not in m for m in self.maps):
            notes.append("calendar data incomplete: assuming continuous calendar")
        missing_waits = sum(1 for m in self.maps if "dependency_wait_days" not in m)
        if missing_waits:
            notes.append(f"dependency waits unavailable for {missing_waits} MAP(s)")
        missing_actuals = sum(1 for m in self.maps if "actual_days" not in m)
        if missing_actuals:
            notes.append(f"actuals not yet collected for {missing_actuals} MAP(s)")
        return scored / len(self.maps)

    def _map_duration(self, m: dict, rng: random.Random) -> float:
        opt = m.get("optimistic_days", m.get("estimated_days", 3))
        mode = m.get("most_likely_days", m.get("estimated_days", 7))
        pes = m.get("pessimistic_days", (m.get("estimated_days", 7) or 7) * 2)
        duration = rng.triangular(float(opt), float(pes), float(mode))
        capacity = m.get("capacity_per_day")
        if capacity and float(capacity) > 0:
            duration = duration / float(capacity)
        wait = m.get("dependency_wait_days", 0) or 0
        return max(0.0, duration + float(wait))

    def _simulate_durations(self, rng: random.Random) -> list[int]:
        totals: list[int] = []
        for _ in range(self.iterations):
            finish: dict[str, float] = {}
            remaining = {str(m.get("id", i)) for i, m in enumerate(self.maps)}
            by_id = {str(m.get("id", i)): m for i, m in enumerate(self.maps)}
            guard = 0
            while remaining and guard < len(self.maps) + 5:
                guard += 1
                progressed = False
                for mid in list(remaining):
                    deps = [str(d) for d in (by_id[mid].get("dependencies", []) or [])]
                    if all(d in finish for d in deps):
                        start = max((finish[d] for d in deps), default=0.0)
                        if by_id[mid].get("status") == "Completed":
                            finish[mid] = start
                        else:
                            finish[mid] = start + self._map_duration(by_id[mid], rng)
                        remaining.remove(mid)
                        progressed = True
                if not progressed:
                    break
            totals.append(round(max(finish.values(), default=0.0)))
        return totals or [0]


__all__ = [
    "CALIBRATION_MIN_HISTORY",
    "BACKTEST_MAPE_THRESHOLD",
    "HistoryPoint",
    "ScenarioResult",
    "ScenarioEstimator",
]
