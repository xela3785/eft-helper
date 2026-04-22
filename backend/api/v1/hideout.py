from fastapi import APIRouter, HTTPException

from core.eft_cache import get_game_data

router = APIRouter()

@router.get('/module/list')
def get_module_list():
    return get_game_data().get('data', {}).get('hideoutStations', [])


@router.get('/module/{module_id}')
def get_module_requirements(
        module_id: str
):
    module_data = None
    for m in get_game_data().get('data', {}).get('hideoutStations', []):
        if m['id'] == module_id:
            module_data = m
            break

    if not module_data:
        raise HTTPException(status_code=404, detail='Module not found')

    return module_data
