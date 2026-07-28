from unittest.mock import MagicMock, patch

from scripts.seed_demo import create_demo_user


def test_create_demo_user():
    mock_client = MagicMock()
    mock_client.post.return_value = MagicMock(status_code=201, json=lambda: {"id": "u1"})
    user = create_demo_user(mock_client)
    assert user["id"] == "u1"
