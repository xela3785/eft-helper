from fastapi import APIRouter, HTTPException

from core.eft_cache import get_game_data

router = APIRouter()

@router.get('/module/list')
async def get_module_list():
    game_data = await get_game_data()
    return game_data.get('data', {}).get('hideoutStations', [])


@router.get('/module/{module_id}')
async def get_module_requirements(
        module_id: str
):
    module_data = None
    game_data = await get_game_data()
    for m in game_data.get('data', {}).get('hideoutStations', []):
        if m['id'] == module_id:
            module_data = m
            break

    if not module_data:
        raise HTTPException(status_code=404, detail='Module not found')

    return module_data
