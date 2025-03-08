from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from models.models import OrderIn_Pydantic, Order_Pydantic, OrderStatus
from controllers.order_controller import (
    get_all_orders,
    get_order_by_id,
    create_order,
    update_order,
    delete_order
)

router = APIRouter(
    prefix="/order",
    tags=["orders"],
    responses={404: {"description": "Not found"}},
)


@router.get("/", response_model=List[Order_Pydantic])
async def read_orders(
    skip: int = Query(0, description="Skip N items"),
    limit: int = Query(100, description="Limit to N items"),
    status: Optional[OrderStatus] = Query(None, description="Filter by order status")
):
    """
    Get all orders with optional pagination and filtering.
    """
    orders = await get_all_orders(skip=skip, limit=limit)
    
    # Filter by status if provided
    if status:
        orders = [order for order in orders if order.status == status]
        
    return orders


@router.get("/{order_id}", response_model=Order_Pydantic)
async def read_order(order_id: int):
    """
    Get a specific order by ID.
    """
    return await get_order_by_id(order_id)


@router.post("/", response_model=Order_Pydantic, status_code=201)
async def create_new_order(order: OrderIn_Pydantic):
    """
    Create a new order.
    """
    return await create_order(order)


@router.put("/{order_id}", response_model=Order_Pydantic)
async def update_existing_order(order_id: int, order: OrderIn_Pydantic):
    """
    Update an existing order.
    """
    return await update_order(order_id, order)


@router.delete("/{order_id}")
async def delete_existing_order(order_id: int):
    """
    Delete an order.
    """
    success = await delete_order(order_id)
    if success:
        return {"message": f"Order {order_id} deleted successfully"}
    return {"message": f"Failed to delete order {order_id}"}