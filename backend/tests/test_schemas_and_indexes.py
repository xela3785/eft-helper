from datetime import datetime, timezone

from core.indexes import ItemIndexes
from models.hideout import HideoutProgress
from schemas.hideout import ModulesSyncList


def test_modules_sync_list_model_validator_from_hideout_progress():
    progress = HideoutProgress(
        module_id="module-42",
        current_level=3,
        level_progress=[{"step": "done"}],
        updated_at=datetime.now(timezone.utc),
        user_id=1,
    )

    payload = ModulesSyncList.model_validate(progress)

    assert payload.module_id == "module-42"
    assert payload.progress.current_level == 3
    assert payload.progress.level_progress == [{"step": "done"}]


def test_item_indexes_paginated_ids_and_cursor_with_search():
    indexes = ItemIndexes()
    indexes._items = [
        {"id": "a", "name": "Alpha Item", "shortName": "ALP"},
        {"id": "b", "name": "Bravo Item", "shortName": "BRV"},
        {"id": "c", "name": "Charlie Item", "shortName": "CHR"},
    ]
    indexes._indexes["default"] = [
        ("a", 100),
        ("b", 80),
        ("c", 60),
    ]

    first_page = indexes.get_paginated_ids(sort_by="default", limit=2)
    second_page = indexes.get_paginated_ids(sort_by="default", cursor_id="b", limit=2)
    filtered = indexes.get_paginated_ids(sort_by="default", limit=10, search="char")
    next_cursor = indexes.get_next_cursor(sort_by="default", current_id="a")

    assert first_page == ["a", "b"]
    assert second_page == ["c"]
    assert filtered == ["c"]
    assert next_cursor == "b"


def test_item_indexes_returns_empty_for_unknown_sort():
    indexes = ItemIndexes()
    indexes._items = [{"id": "a", "name": "Alpha", "shortName": "ALP"}]
    indexes._indexes["default"] = [("a", 1)]

    result = indexes.get_paginated_ids(sort_by="unknown", limit=10)

    assert result == []
