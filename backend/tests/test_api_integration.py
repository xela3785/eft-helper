from datetime import datetime, timezone

import pytest

from core.eft_cache import MarketCache, ModulesCache
from core.indexes import item_indexes


async def register_and_login(api_client, email: str = "api-user@example.com", password: str = "secret123"):
    register_response = await api_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password},
    )
    assert register_response.status_code == 200

    login_response = await api_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_response.status_code == 204


@pytest.mark.asyncio
async def test_auth_endpoints_register_login_me_logout(api_client):
    await register_and_login(api_client)

    me_response = await api_client.get("/api/v1/auth/me")
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "api-user@example.com"

    logout_response = await api_client.post("/api/v1/auth/logout")
    assert logout_response.status_code == 204


@pytest.mark.asyncio
async def test_auth_me_unauthorized_without_tokens(api_client):
    response = await api_client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert response.json()["detail"] == "Could not validate credentials"


@pytest.mark.asyncio
async def test_hideout_endpoints_module_list_module_and_progress_flow(api_client, monkeypatch):
    async def fake_get_data(self):
        return {
            "data": {
                "hideoutStations": [
                    {"id": "module-1", "name": "Generator"},
                    {"id": "module-2", "name": "Medstation"},
                ]
            }
        }

    async def fake_get_module(self, module_id: str):
        if module_id == "module-1":
            return {"id": "module-1", "name": "Generator"}
        return None

    monkeypatch.setattr(ModulesCache, "get_data", fake_get_data)
    monkeypatch.setattr(ModulesCache, "get_module", fake_get_module)

    await register_and_login(api_client, email="hideout-api@example.com")

    module_list_response = await api_client.get("/api/v1/hideout/module/list")
    assert module_list_response.status_code == 200
    assert len(module_list_response.json()) == 2

    module_response = await api_client.get("/api/v1/hideout/module/module-1")
    assert module_response.status_code == 200
    assert module_response.json()["name"] == "Generator"

    missing_module_response = await api_client.get("/api/v1/hideout/module/missing")
    assert missing_module_response.status_code == 404

    now = datetime.now(timezone.utc).isoformat()
    sync_payload = [
        {
            "module_id": "module-1",
            "progress": {
                "current_level": 1,
                "level_progress": [{"step": "started"}],
                "updated_at": now,
            },
        }
    ]

    sync_response = await api_client.post("/api/v1/hideout/sync", json=sync_payload)
    assert sync_response.status_code == 200
    assert sync_response.json()[0]["module_id"] == "module-1"
    assert sync_response.json()[0]["progress"]["current_level"] == 1

    progress_response = await api_client.get("/api/v1/hideout/progress")
    assert progress_response.status_code == 200
    assert progress_response.json()[0]["module_id"] == "module-1"


@pytest.mark.asyncio
async def test_market_prices_endpoint_returns_paginated_data(api_client, monkeypatch):
    monkeypatch.setattr(
        item_indexes,
        "get_paginated_ids",
        lambda sort_by, cursor_id, limit, search: ["item-1", "item-2"],
    )
    monkeypatch.setattr(item_indexes, "get_next_cursor", lambda sort_by, current_id: "item-3")

    async def fake_get_item(self, item_id: str):
        return {"name": f"name-{item_id}", "avg24hPrice": 123}

    monkeypatch.setattr(MarketCache, "get_item", fake_get_item)

    response = await api_client.get("/api/v1/market/prices?sort_by=default&limit=2")
    body = response.json()

    assert response.status_code == 200
    assert len(body["items"]) == 2
    assert body["items"][0]["id"] == "item-1"
    assert body["next_cursor"] == "item-3"
    assert body["has_more"] is True


@pytest.mark.asyncio
async def test_market_prices_endpoint_empty_page(api_client, monkeypatch):
    monkeypatch.setattr(item_indexes, "get_paginated_ids", lambda sort_by, cursor_id, limit, search: [])

    response = await api_client.get("/api/v1/market/prices")
    body = response.json()

    assert response.status_code == 200
    assert body["items"] == []
    assert body["next_cursor"] is None
    assert body["has_more"] is False
