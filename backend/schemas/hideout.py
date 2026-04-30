from datetime import datetime
from typing import Any, Dict, List

from pydantic import BaseModel, model_validator

from models.hideout import HideoutProgress


class ModuleSyncObject(BaseModel):
    current_level: int
    level_progress: List[Dict[str, Any]]
    updated_at: datetime


class ModulesSyncList(BaseModel):
    module_id: str
    progress: ModuleSyncObject

    @model_validator(mode="before")
    @classmethod
    def from_hideout_progress(cls, hideout_progress: HideoutProgress) -> Dict[str, Any] | HideoutProgress:
        if hasattr(hideout_progress, "module_id") and hasattr(hideout_progress, "current_level"):
            return {
                "module_id": hideout_progress.module_id,
                "progress": {
                    "current_level": hideout_progress.current_level,
                    "level_progress": hideout_progress.level_progress,
                    "updated_at": hideout_progress.updated_at,
                },
            }
        return hideout_progress
