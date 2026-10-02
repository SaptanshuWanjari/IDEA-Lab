from app.services.scenario_estimator import ScenarioEstimator


def _maps():
    return [
        {"id": "a", "department": "IT", "dependencies": [], "status": "Pending",
         "optimistic_days": 3, "most_likely_days": 7, "pessimistic_days": 14},
        {"id": "b", "department": "Operations", "dependencies": ["a"], "status": "Pending",
         "optimistic_days": 2, "most_likely_days": 5, "pessimistic_days": 10},
    ]


def test_scenario_is_labelled_uncalibrated_without_historical_actuals():
    result = ScenarioEstimator(_maps(), history=[]).run(seed=17)
    assert result.calibrated is False
    assert any("missing historical actuals" in note for note in result.data_quality_notes)


def test_scenario_is_reproducible_for_same_seed():
    first = ScenarioEstimator(_maps(), history=[]).run(seed=17)
    second = ScenarioEstimator(_maps(), history=[]).run(seed=17)
    assert first.estimate_range == second.estimate_range
    assert first.seed == 17
    assert first.input_snapshot_id
