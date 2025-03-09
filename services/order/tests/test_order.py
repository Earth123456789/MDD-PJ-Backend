import pytest
from httpx import AsyncClient
from fastapi import FastAPI
from datetime import date, timedelta

# Import your FastAPI app
from main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


@pytest.mark.anyio
async def test_create_order(client: AsyncClient):
    # Set up test data
    tomorrow = date.today() + timedelta(days=1)
    next_week = date.today() + timedelta(days=7)
    
    order_data = {
        "customer_id": 1,
        "pickup_location": "123 Pickup St, City",
        "delivery_location": "456 Delivery St, City",
        "requested_pickup_date": tomorrow.isoformat(),
        "delivery_deadline": next_week.isoformat(),
        "total_price": 100.50,
        "status": "pending"
    }
    
    # Make the request
    response = await client.post("/order/", json=order_data)
    
    # Check the response
    assert response.status_code == 201
    data = response.json()
    assert data["customer_id"] == order_data["customer_id"]
    assert data["pickup_location"] == order_data["pickup_location"]
    assert data["delivery_location"] == order_data["delivery_location"]
    assert data["status"] == order_data["status"]
    
    # Store order_id for other tests
    order_id = data["order_id"]
    return order_id


@pytest.mark.anyio
async def test_get_order(client: AsyncClient, test_create_order):
    order_id = test_create_order
    
    # Make the request
    response = await client.get(f"/order/{order_id}")
    
    # Check the response
    assert response.status_code == 200
    data = response.json()
    assert data["order_id"] == order_id


@pytest.mark.anyio
async def test_update_order(client: AsyncClient, test_create_order):
    order_id = test_create_order
    
    # Set up update data
    update_data = {
        "status": "processing"
    }
    
    # Make the request
    response = await client.put(f"/order/{order_id}", json=update_data)
    
    # Check the response
    assert response.status_code == 200
    data = response.json()
    assert data["order_id"] == order_id
    assert data["status"] == update_data["status"]


@pytest.mark.anyio
async def test_delete_order(client: AsyncClient, test_create_order):
    order_id = test_create_order
    
    # Make the request
    response = await client.delete(f"/order/{order_id}")
    
    # Check the response
    assert response.status_code == 200
    data = response.json()
    assert "deleted successfully" in data["message"]
    
    # Verify order is deleted
    response = await client.get(f"/order/{order_id}")
    assert response.status_code == 404