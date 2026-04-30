from typing import Annotated, List

from fastapi import APIRouter, HTTPException, Depends

from api.dependencies import get_current_active_user, get_hideout_service
from core.eft_cache import ModulesCache
from models.users import User
from schemas.hideout import ModulesSyncList
from services.hideout_services import HideoutService

router = APIRouter()


@router.get('/module/list')
async def get_module_list():
    game_data = await ModulesCache().get_data()
    return game_data.get('data', {}).get('hideoutStations', [])


@router.get('/module/{module_id}')
async def get_module_requirements(
        module_id: str
):
    module_data = await ModulesCache().get_module(module_id)
    if not module_data:
        raise HTTPException(status_code=404, detail='Module not found')

    return module_data


@router.post('/sync', response_model=List[ModulesSyncList])
async def sync_hideout(
        hideout_data: List[ModulesSyncList],
        current_user: User = Depends(get_current_active_user),
        hideout_service: HideoutService = Depends(get_hideout_service),
):
    return await hideout_service.sync_hideout(hideout_data, current_user)


@router.get('/progress', response_model=List[ModulesSyncList])
async def get_module_progress(
        current_user: Annotated[User, Depends(get_current_active_user)],
        hideout_service: HideoutService = Depends(get_hideout_service)
):
    return await hideout_service.get_hideout_progress(current_user)
