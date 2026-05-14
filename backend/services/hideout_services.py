from typing import List, Sequence

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from models.hideout import HideoutProgress
from models.users import User
from schemas.hideout import ModulesSyncList


class HideoutService:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def sync_hideout(self, hideout_data: List[ModulesSyncList], current_user: User) -> Sequence[HideoutProgress]:
        if not current_user:
            raise HTTPException(status_code=400, detail="User not found. Can't Sync Hideout.")

        if not hideout_data:
            return await self.get_hideout_progress(current_user)

        module_ids = [item.module_id for item in hideout_data]
        existing_result = await self.db.execute(
            select(HideoutProgress).where(
                HideoutProgress.user_id == current_user.id, HideoutProgress.module_id.in_(module_ids)
            )
        )
        existing_map = {
            row.module_id: row for row in existing_result.scalars().all()
        }

        for item in hideout_data:
            progress = existing_map.get(item.module_id)
            if progress is None:
                self.db.add(
                    HideoutProgress(
                        user_id=current_user.id,
                        module_id=item.module_id,
                        current_level=item.progress.current_level,
                        level_progress=item.progress.level_progress,
                        updated_at=item.progress.updated_at,
                    )
                )
            else:
                progress.current_level = item.progress.current_level
                progress.level_progress = item.progress.level_progress
                progress.updated_at = item.progress.updated_at

        await self.db.commit()

        return await self.get_hideout_progress(current_user)

    async def get_hideout_progress(self, current_user: User) -> Sequence[HideoutProgress]:
        if not current_user:
            raise HTTPException(status_code=400, detail="User not found. Can't Get Hideout Progress.")
        result = await self.db.execute(
            select(HideoutProgress).where(
                HideoutProgress.user_id == current_user.id
            )
        )
        return result.scalars().all()
