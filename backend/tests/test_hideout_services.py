from datetime import datetime, timezone

import pytest
from fastapi import HTTPException

from models.users import User
from schemas.hideout import ModulesSyncList
from services.hideout_services import HideoutService


@pytest.mark.asyncio
async def test_sync_hideout_creates_and_updates_progress(db_session):
    user = User(email="hideout@example.com", hashed_password="hash")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    service = HideoutService(db_session)
    now = datetime.now(timezone.utc)

    create_payload = [
        ModulesSyncList.model_validate(
            {
                "module_id": "module-1",
                "progress": {
                    "current_level": 1,
                    "level_progress": [{"key": "value"}],
                    "updated_at": now,
                },
            }
        )
    ]
    created = await service.sync_hideout(create_payload, user)
    assert len(created) == 1
    assert created[0].module_id == "module-1"
    assert created[0].current_level == 1

    update_payload = [
        ModulesSyncList.model_validate(
            {
                "module_id": "module-1",
                "progress": {
                    "current_level": 2,
                    "level_progress": [{"updated": True}],
                    "updated_at": now,
                },
            }
        )
    ]
    updated = await service.sync_hideout(update_payload, user)
    assert len(updated) == 1
    assert updated[0].current_level == 2
    assert updated[0].level_progress == [{"updated": True}]


@pytest.mark.asyncio
async def test_sync_hideout_without_user_raises_400(db_session):
    service = HideoutService(db_session)

    with pytest.raises(HTTPException) as exc_info:
        await service.sync_hideout([], None)

    assert exc_info.value.status_code == 400
    assert "User not found" in exc_info.value.detail
