import pytest
from httpx import AsyncClient
from fastapi import FastAPI
from datetime import date, timedelta

# Import your FastAPI app
from main import app
from tests.test_order import test_create_order


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


@pytest.mark.anyio
async def test_create_order_item(client: AsyncClient, test_create_order):
    order_id = test_create_order
    
    # Set up test data
    item_data = {
        "cargo_type": "Electronics",
        "weight_kg": 5.75,
        "dimensions_cm": "30x20x15",
        "special_requirements": "Handle with care",
        "item_price": 50.25,
        "status": "pending"
    }
    
    # Make the request
    response = await client.post(f"/order/{order_id}/item/", json=item_data)
    
    # Check the response
    assert response.status_code == 201
    data = response.json()
    assert data["cargo_type"] == item_data["cargo_type"]
    assert float(data["weight_kg"]) == item_data["weight_kg"]
    assert data["dimensions_cm"] == item_data["dimensions_cm"]
    assert data["special_requirements"] == item_data["special_requirements"]
    assert float(data["item_price"]) == item_data["item_price"]
    assert data["status"] == item_data["status"]
    
    # Store item_id for other tests
    item_id = data["item_id"]
    return order_id, item_id


@pytest.mark.anyio
async def test_get_order_items(client: AsyncClient, test_create_order_item):
    order_id, _ = test_create_order_item
    
    # Make the request
    response = await client.get(f"/order/{order_id}/item/")
    
    # Check the response
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["order_id"] == order_id


@pytest.mark.anyio
async def test_get_order_item(client: AsyncClient, test_create_order_item):
    order_id, item_id = test_create_order_item
    
    # Make the request
    response = await client.get(f"/order/{order_id}/item/{item_id}")
    
    # Check the response
    assert response.status_code == 200
    data = response.json()
    assert data["item_id"] == item_id
    assert data["order_id"] == order_id


@pytest.mark.anyio
async def test_update_order_item(client: AsyncClient, test_create_order_item):
    order_id, item_id = test_create_order_item
    
    # Set up update data
    update_data = {
        "status": "packed",
        "weight_kg": 6.0
    }
    
    # Make the request
    response = await client.put(f"/order/{order_id}/item/{item_id}", json=update_data)
    
    # Check the response
    assert response.status_code == 200
    data = response.json()
    assert data["item_id"] == item_id
    assert data["status"] == update_data["status"]
    assert float(data["weight_kg"]) == update_data["weight_kg"]


@pytest.mark.anyio
async def test_delete_order_item(client: AsyncClient, test_create_order_item):
    order_id, item_id = test_create_order_item
    
    # Make the request
    response = await client.delete(f"/order/{order_id}/item/{item_id}")
    
    # Check the response
    assert response.status_code == 200
    data = response.json()
    assert "deleted successfully" in data["message"]
    
    # Verify item is deleted
    response = await client.get(f"/order/{order_id}/item/{item_id}")
    assert response.status_code == 404