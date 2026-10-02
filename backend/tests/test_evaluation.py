from app.services.evaluation import GoldSetItem, evaluate_obligations


def _gold():
    return [
        GoldSetItem(
            obligation_id="obl-1",
            obligation_text="Banks shall report incidents within 30 days",
            quote="Banks shall report incidents within 30 days",
            page=3,
            deadline="within 30 days of detection",
            owner="Compliance",
        ),
        GoldSetItem(
            obligation_id="obl-2",
            obligation_text="Banks shall retain audit logs for 12 months",
            quote="Banks shall retain audit logs for 12 months",
            page=5,
            deadline="retain for 12 months",
            owner="IT",
        ),
    ]


def test_evaluation_counts_only_citation_valid_obligations_as_true_positive():
    from app.services.evaluation import PredictedObligation

    predictions = [
        PredictedObligation(
            obligation_id="obl-1",
            obligation_text="Banks shall report incidents within 30 days",
            citation_valid=True,
            deadline="within 30 days of detection",
            owner="Compliance",
            edited_by_reviewer=False,
        ),
        PredictedObligation(
            obligation_id="obl-2",
            obligation_text="Banks shall retain audit logs for 12 months",
            citation_valid=False,
            deadline="retain for 12 months",
            owner="IT",
            edited_by_reviewer=False,
        ),
    ]
    report = evaluate_obligations(predictions, _gold())
    assert report.citation_precision == 0.5


def test_evaluation_recall_and_deadline_owner_metrics():
    from app.services.evaluation import PredictedObligation

    predictions = [
        PredictedObligation(
            obligation_id="obl-1",
            obligation_text="Banks shall report incidents within 30 days",
            citation_valid=True,
            deadline="within 30 days of detection",
            owner="Compliance",
            edited_by_reviewer=True,
        ),
    ]
    report = evaluate_obligations(predictions, _gold())
    assert report.recall == 0.5
    assert report.deadline_exact_match == 1.0
    assert report.owner_agreement == 1.0
    assert report.reviewer_edit_rate == 1.0
