from typing import List
from fastapi import APIRouter, HTTPException
from models.models import OrderItemIn_Pydantic, OrderItem_Pydantic
from controllers.order_item_controller import (
    get_order_items,
    get_order_item,
    create_order_item,
    update_order_item,
    delete_order_item
)

router = APIRouter(
    prefix="/order/{order_id}/item",
    tags=["order items"],
    responses={404: {"description": "Not found"}},
)


@router.get("/", response_model=List[OrderItem_Pydantic])
async def read_order_items(order_id: int):
    """
    Get all items for a specific order.
    """
    return await get_order_items(order_id)


@router.get("/{item_id}", response_model=OrderItem_Pydantic)
async def read_order_item(order_id: int, item_id: int):
    """
    Get a specific item from an order.
    """
    return await get_order_item(order_id, item_id)


@router.post("/", response_model=OrderItem_Pydantic, status_code=201)
async def add_order_item(order_id: int, item: OrderItemIn_Pydantic):
    """
    Add a new item to an order.
    """
    return await create_order_item(order_id, item)


@router.put("/{item_id}", response_model=OrderItem_Pydantic)
async def update_existing_item(order_id: int, item_id: int, item: OrderItemIn_Pydantic):
    """
    Update an existing item in an order.
    """
    return await update_order_item(order_id, item_id, item)


@router.delete("/{item_id}")
async def delete_existing_item(order_id: int, item_id: int):
    """
    Delete an item from an order.
    """
    success = await delete_order_item(order_id, item_id)
    if success:
        return {"message": f"Item {item_id} deleted successfully from order {order_id}"}
    return {"message": f"Failed to delete item {item_id} from order {order_id}"}