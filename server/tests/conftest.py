import pytest

from server import photos


@pytest.fixture(autouse=True)
def reset_photo_store():
    photos._store = None
    yield
    photos._store = None
