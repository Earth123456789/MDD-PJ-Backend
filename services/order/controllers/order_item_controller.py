from typing import List
from fastapi import HTTPException
from models.models import (
    Order,
    OrderItem,
    OrderItem_Pydantic,
    OrderItemIn_Pydantic
)
from utils.rabbit_utils import rabbit_client


async def get_order_items(order_id: int) -> List[OrderItem_Pydantic]:
    """Get all items for a specific order."""
    # Check if order exists
    order = await Order.filter(order_id=order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail=f"Order with ID {order_id} not found")
    
    # Get items related to order
    items = await OrderItem.filter(order_id=order_id)
    return await OrderItem_Pydantic.from_queryset(OrderItem.filter(order_id=order_id))


async def get_order_item(order_id: int, item_id: int) -> OrderItem_Pydantic:
    """Get a specific item from an order."""
    item = await OrderItem.filter(order_id=order_id, item_id=item_id).first()
    if not item:
        raise HTTPException(
            status_code=404, 
            detail=f"Item with ID {item_id} not found in order {order_id}"
        )
    return await OrderItem_Pydantic.from_tortoise_orm(item)


async def create_order_item(order_id: int, item_data: OrderItemIn_Pydantic) -> OrderItem_Pydantic:
    """Add a new item to an order."""
    # Check if order exists
    order = await Order.filter(order_id=order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail=f"Order with ID {order_id} not found")
    
    # Create item dict and set the order_id
    item_dict = item_data.dict()
    item_dict["order_id"] = order_id
    
    # Create the item
    item = await OrderItem.create(**item_dict)
    
    # Recalculate order total price (sum of all items)
    all_items = await OrderItem.filter(order_id=order_id)
    total_price = sum(float(item.item_price) for item in all_items)
    await order.update_from_dict({"total_price": total_price})
    await order.save()
    
    # Publish to RabbitMQ
    item_obj = await OrderItem_Pydantic.from_tortoise_orm(item)
    rabbit_client.publish_message(
        message=item_obj.dict(),
        message_type="order_item.created"
    )
    
    return await OrderItem_Pydantic.from_tortoise_orm(item)


async def update_order_item(order_id: int, item_id: int, item_data: OrderItemIn_Pydantic) -> OrderItem_Pydantic:
    """Update an existing item in an order."""
    # Check if item exists
    item = await OrderItem.filter(order_id=order_id, item_id=item_id).first()
    if not item:
        raise HTTPException(
            status_code=404, 
            detail=f"Item with ID {item_id} not found in order {order_id}"
        )
    
    # Update the item
    item_dict = item_data.dict(exclude_unset=True)
    await item.update_from_dict(item_dict)
    await item.save()
    
    # If price changed, recalculate order total price
    if "item_price" in item_dict:
        order = await Order.filter(order_id=order_id).first()
        all_items = await OrderItem.filter(order_id=order_id)
        total_price = sum(float(item.item_price) for item in all_items)
        await order.update_from_dict({"total_price": total_price})
        await order.save()
    
    # Publish to RabbitMQ
    item_obj = await OrderItem_Pydantic.from_tortoise_orm(item)
    rabbit_client.publish_message(
        message=item_obj.dict(),
        message_type="order_item.updated"
    )
    
    return await OrderItem_Pydantic.from_tortoise_orm(item)


async def delete_order_item(order_id: int, item_id: int) -> bool:
    """Delete an item from an order."""
    # Check if item exists
    item = await OrderItem.filter(order_id=order_id, item_id=item_id).first()
    if not item:
        raise HTTPException(
            status_code=404, 
            detail=f"Item with ID {item_id} not found in order {order_id}"
        )
    
    # Get item data before deletion for the message
    item_obj = await OrderItem_Pydantic.from_tortoise_orm(item)
    
    # Delete the item
    await item.delete()
    
    # Recalculate order total price
    order = await Order.filter(order_id=order_id).first()
    all_items = await OrderItem.filter(order_id=order_id)
    total_price = sum(float(item.item_price) for item in all_items)
    await order.update_from_dict({"total_price": total_price})
    await order.save()
    
    # Publish to RabbitMQ
    rabbit_client.publish_message(
        message={"item_id": item_id, "order_id": order_id, "details": item_obj.dict()},
        message_type="order_item.deleted"
    )
    
    return True