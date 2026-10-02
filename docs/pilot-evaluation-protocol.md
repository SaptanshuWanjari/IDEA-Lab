# Pilot Evaluation Protocol (`pilot-eval-v1`)

Versioned acceptance protocol for the single-bank pilot. This document is the
normative source for gold-set evaluation and scenario-estimate calibration.
Backend implementation: `backend/app/services/evaluation.py`,
`backend/app/services/scenario_estimator.py`.

## 1. Gold-set format

- A gold set is a reviewer-approved list of obligations for one regulation
  version. Each item: `obligation_id`, `obligation_text`, `quote`, `page`,
  `deadline` (semantic string, e.g. "within 30 days of detection" vs
  "retain for 12 months"), `owner`.
- Gold sets are imported read-only; evaluation never mutates them. Results are
  stored read-only alongside the report snapshot (`payload.evaluation`).
- Endpoints: `POST /regulations/evaluate` (scores predictions vs gold set);
  snapshots accept an optional `evaluation` block via `POST /reports/snapshots`.

## 2. Metrics

Given `predictions` and a gold set, `evaluate_obligations` reports:

| Metric | Definition |
|---|---|
| `recall` | Citation-valid predictions matching a gold id / gold-set size. |
| `citation_precision` | Citation-valid matches / total predictions. A prediction with an invalid citation is **never** a true positive, even if the text matches. |
| `deadline_exact_match` | Fraction of true positives whose deadline string semantically matches gold exactly (normalised comparison; retention "retain for 12 months" must not match an implementation due date). |
| `owner_agreement` | Fraction of true positives whose owner matches gold. |
| `reviewer_edit_rate` | Fraction of predictions edited by a reviewer. |

## 3. Acceptance thresholds (pilot gate)

| Metric | Pilot threshold |
|---|---|
| `recall` | >= 0.80 |
| `citation_precision` | >= 0.90 (no citation-invalid approvals) |
| `deadline_exact_match` | >= 0.90 |
| `owner_agreement` | >= 0.80 |

A pilot report is accepted only when all four thresholds hold on the current
gold set and the snapshot records the passing `evaluation` block.

## 4. Calibration rule (scenario estimates)

- All twin outputs are **Implementation Scenario Estimates**, never forecasts.
- `ScenarioEstimator.run(seed)` returns `calibrated: false` plus
  `data_quality_notes` (including "missing historical actuals" when no
  history exists) until **both** conditions hold:
  1. At least **30** historical actuals (`predicted_days` vs `actual_days`)
     have been collected (MAP actuals, capacity, calendar availability,
     dependency waits are recorded per MAP input).
  2. Backtest mean absolute percentage error (MAPE) over those actuals is
     **<= 0.25**.
- The UI/API must display the `Calibrated`/`Uncalibrated` badge, the
  data-quality notes, the reproducible `seed`, and the `input_snapshot_id`.
  The `calibrated` label is prohibited until the backtest threshold is met.
- Reproducibility: the same `seed` + input snapshot always yields the same
  `estimate_range`.
