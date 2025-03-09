from typing import List
from fastapi import APIRouter, HTTPException
from models.models import OrderStatusHistoryIn_Pydantic, OrderStatusHistory_Pydantic
from controllers.status_history_controller import (
    get_status_history,
    get_status_history_entry,
    create_status_history_entry,
    delete_status_history_entry
)

router = APIRouter(
    prefix="/order/{order_id}/history-status",
    tags=["order status history"],
    responses={404: {"description": "Not found"}},
)


@router.get("/", response_model=List[OrderStatusHistory_Pydantic])
async def read_status_history(order_id: int):
    """
    Get the status history for a specific order.
    """
    return await get_status_history(order_id)


@router.get("/{history_id}", response_model=OrderStatusHistory_Pydantic)
async def read_status_history_entry(order_id: int, history_id: int):
    """
    Get a specific status history entry.
    """
    return await get_status_history_entry(order_id, history_id)


@router.post("/", response_model=OrderStatusHistory_Pydantic, status_code=201)
async def add_status_history_entry(order_id: int, history: OrderStatusHistoryIn_Pydantic):
    """
    Create a new status history entry for an order.
    """
    return await create_status_history_entry(order_id, history)


@router.delete("/{history_id}")
async def delete_history_entry(order_id: int, history_id: int):
    """
    Delete a status history entry.
    """
    success = await delete_status_history_entry(order_id, history_id)
    if success:
        return {"message": f"History entry {history_id} deleted successfully from order {order_id}"}
    return {"message": f"Failed to delete history entry {history_id} from order {order_id}"}