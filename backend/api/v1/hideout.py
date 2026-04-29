from fastapi import APIRouter, HTTPException

from core.eft_cache import ModulesCache

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
