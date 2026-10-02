"""Gold-set evaluation harness for the single-bank pilot.

Compares predicted obligations against a versioned, reviewer-approved gold set.
Only predictions with a valid regulation-version citation count as true
positives; citation-invalid predictions never inflate precision.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class GoldSetItem:
    obligation_id: str
    obligation_text: str
    quote: str = ""
    page: int | None = None
    deadline: str | None = None
    owner: str | None = None


@dataclass(frozen=True)
class PredictedObligation:
    obligation_id: str
    obligation_text: str = ""
    citation_valid: bool = False
    deadline: str | None = None
    owner: str | None = None
    edited_by_reviewer: bool = False


@dataclass(frozen=True)
class EvaluationReport:
    recall: float
    citation_precision: float
    deadline_exact_match: float
    owner_agreement: float
    reviewer_edit_rate: float
    true_positives: int = 0
    false_positives: int = 0
    gold_size: int = 0
    prediction_count: int = 0
    protocol_version: str = "pilot-eval-v1"
    notes: tuple[str, ...] = ()


def _norm(text: str | None) -> str:
    return " ".join((text or "").strip().lower().split())


def evaluate_obligations(
    predictions: list[PredictedObligation],
    gold_set: list[GoldSetItem],
    protocol_version: str = "pilot-eval-v1",
) -> EvaluationReport:
    """Compare predictions to gold set.

    A true positive requires the predicted obligation_id to exist in the gold
    set AND a valid citation (citation_valid=True). Citation-invalid matches
    are false positives and do not count toward recall.
    """
    gold_by_id = {g.obligation_id: g for g in gold_set}
    true_positives: list[tuple[PredictedObligation, GoldSetItem]] = []
    false_positives = 0
    for pred in predictions:
        gold = gold_by_id.get(pred.obligation_id)
        if gold is not None and pred.citation_valid:
            true_positives.append((pred, gold))
        else:
            false_positives += 1

    gold_size = len(gold_set)
    pred_count = len(predictions)
    recall = (len(true_positives) / gold_size) if gold_size else 0.0
    citation_precision = (len(true_positives) / pred_count) if pred_count else 0.0

    if true_positives:
        deadline_hits = sum(
            1 for pred, gold in true_positives if _norm(pred.deadline) == _norm(gold.deadline)
        )
        owner_hits = sum(
            1 for pred, gold in true_positives if _norm(pred.owner) == _norm(gold.owner)
        )
        deadline_exact_match = deadline_hits / len(true_positives)
        owner_agreement = owner_hits / len(true_positives)
    else:
        deadline_exact_match = 0.0
        owner_agreement = 0.0

    reviewer_edit_rate = (
        sum(1 for p in predictions if p.edited_by_reviewer) / pred_count
        if pred_count
        else 0.0
    )

    notes: list[str] = []
    if any(not p.citation_valid for p in predictions):
        notes.append("citation-invalid predictions excluded from true positives")

    return EvaluationReport(
        recall=recall,
        citation_precision=citation_precision,
        deadline_exact_match=deadline_exact_match,
        owner_agreement=owner_agreement,
        reviewer_edit_rate=reviewer_edit_rate,
        true_positives=len(true_positives),
        false_positives=false_positives,
        gold_size=gold_size,
        prediction_count=pred_count,
        protocol_version=protocol_version,
        notes=tuple(notes),
    )


__all__ = [
    "GoldSetItem",
    "PredictedObligation",
    "EvaluationReport",
    "evaluate_obligations",
]
