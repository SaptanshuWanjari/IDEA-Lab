import random

from app.services.digital_twin import DigitalTwin


def test_monte_carlo_simulation():
    maps = [
        {"id": "a", "department": "Compliance", "dependencies": [], "status": "Completed", "optimistic_days": 2, "most_likely_days": 5, "pessimistic_days": 10},
        {"id": "b", "department": "IT", "dependencies": ["a"], "status": "Pending"},
        {"id": "c", "department": "Operations", "dependencies": ["b"], "status": "Pending"},
    ]
    twin = DigitalTwin(maps, iterations=50)
    result = twin.simulate()
    assert result["median_completion_days"] > 0
    assert "bottleneck_department" in result
    assert result["iterations"] == 50


def test_ripple_effect():
    random.seed(0)
    maps = [
        {"id": "a", "department": "IT", "dependencies": [], "status": "Pending", "optimistic_days": 3, "most_likely_days": 7, "pessimistic_days": 14},
        {"id": "b", "department": "Operations", "dependencies": ["a"], "status": "Pending"},
    ]
    twin = DigitalTwin(maps, iterations=100)
    ripple = twin.ripple_effect("a", 30)
    assert ripple["delta_days"] > 0
