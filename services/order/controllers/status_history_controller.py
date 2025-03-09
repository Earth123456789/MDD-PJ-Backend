from typing import List
from fastapi import HTTPException
from models.models import (
    Order,
    OrderStatusHistory,
    OrderStatusHistory_Pydantic,
    OrderStatusHistoryIn_Pydantic
)
from utils.rabbit_utils import rabbit_client


async def get_status_history(order_id: int) -> List[OrderStatusHistory_Pydantic]:
    """Get the status history for a specific order."""
    # Check if order exists
    order = await Order.filter(order_id=order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail=f"Order with ID {order_id} not found")
    
    history = await OrderStatusHistory.filter(order_id=order_id).order_by("-changed_at")
    return await OrderStatusHistory_Pydantic.from_queryset(
        OrderStatusHistory.filter(order_id=order_id).order_by("-changed_at")
    )


async def get_status_history_entry(order_id: int, history_id: int) -> OrderStatusHistory_Pydantic:
    """Get a specific status history entry."""
    history_entry = await OrderStatusHistory.filter(order_id=order_id, history_id=history_id).first()
    if not history_entry:
        raise HTTPException(
            status_code=404, 
            detail=f"History entry with ID {history_id} not found for order {order_id}"
        )
    return await OrderStatusHistory_Pydantic.from_tortoise_orm(history_entry)


async def create_status_history_entry(
    order_id: int, 
    history_data: OrderStatusHistoryIn_Pydantic
) -> OrderStatusHistory_Pydantic:
    """Create a new status history entry for an order."""
    # Check if order exists
    order = await Order.filter(order_id=order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail=f"Order with ID {order_id} not found")
    
    # Create history dict and set the order_id
    history_dict = history_data.dict()
    history_dict["order_id"] = order_id
    
    # Create the history entry
    history_entry = await OrderStatusHistory.create(**history_dict)
    
    # Update the order status to match the latest history entry
    await order.update_from_dict({"status": history_dict["status"]})
    await order.save()
    
    # Publish to RabbitMQ
    history_obj = await OrderStatusHistory_Pydantic.from_tortoise_orm(history_entry)
    rabbit_client.publish_message(
        message=history_obj.dict(),
        message_type="order_status.updated"
    )
    
    return await OrderStatusHistory_Pydantic.from_tortoise_orm(history_entry)


async def delete_status_history_entry(order_id: int, history_id: int) -> bool:
    """Delete a status history entry."""
    # Check if history entry exists
    history_entry = await OrderStatusHistory.filter(order_id=order_id, history_id=history_id).first()
    if not history_entry:
        raise HTTPException(
            status_code=404, 
            detail=f"History entry with ID {history_id} not found for order {order_id}"
        )
    
    # Get history data before deletion for the message
    history_obj = await OrderStatusHistory_Pydantic.from_tortoise_orm(history_entry)
    
    # Delete the history entry
    await history_entry.delete()
    
    # Publish to RabbitMQ
    rabbit_client.publish_message(
        message={
            "history_id": history_id, 
            "order_id": order_id, 
            "details": history_obj.dict()
        },
        message_type="order_status_history.deleted"
    )
    
    return True