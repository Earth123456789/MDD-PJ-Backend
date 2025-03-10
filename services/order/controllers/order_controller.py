from typing import List, Optional
from fastapi import HTTPException
from models.models import (
    Order, 
    OrderStatus, 
    Order_Pydantic, 
    OrderIn_Pydantic,
    OrderStatusHistory
)
from utils.rabbit_utils import rabbit_client
import pika


def create_rabbitmq_connection():
    connection = pika.BlockingConnection(
        pika.ConnectionParameters(
            host='rabbitmq',  
            port=5672,
            virtual_host='/',
            credentials=pika.PlainCredentials('guest', 'guest')  
        )
    )
    return connection

async def get_all_orders(skip: int = 0, limit: int = 100) -> List[Order_Pydantic]:
    """Get all orders with pagination."""
    orders = await Order.all().offset(skip).limit(limit)
    return await Order_Pydantic.from_queryset(Order.all().offset(skip).limit(limit))


async def get_order_by_id(order_id: int) -> Order_Pydantic:
    """Get a specific order by ID."""
    order = await Order.filter(order_id=order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail=f"Order with ID {order_id} not found")
    return await Order_Pydantic.from_tortoise_orm(order)


async def create_order(order_data: OrderIn_Pydantic) -> Order_Pydantic:
    """Create a new order."""
    order_dict = order_data.dict()
    
    # Create the order
    order = await Order.create(**order_dict)
    
    # Create initial status history entry
    await OrderStatusHistory.create(
        order_id=order.order_id,
        status=OrderStatus.PENDING,
        changed_by=order.customer_id,
        notes="Order created"
    )
    
    # Publish to RabbitMQ
    order_obj = await Order_Pydantic.from_tortoise_orm(order)
    rabbit_client.publish_message(
        message=order_obj.dict(),
        message_type="order.created"
    )
    
    return await Order_Pydantic.from_tortoise_orm(order)


async def update_order(order_id: int, order_data: OrderIn_Pydantic) -> Order_Pydantic:
    """Update an existing order."""
    order = await Order.filter(order_id=order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail=f"Order with ID {order_id} not found")
    
    order_dict = order_data.dict(exclude_unset=True)
    
    # If status is changed, add to history
    if 'status' in order_dict and order_dict['status'] != order.status:
        # Create status history entry
        await OrderStatusHistory.create(
            order_id=order.order_id,
            status=order_dict['status'],
            changed_by=order_dict.get('customer_id', order.customer_id),
            notes=f"Status changed to {order_dict['status']}"
        )
    
    # Update order
    await order.update_from_dict(order_dict)
    await order.save()
    
    # Publish to RabbitMQ
    updated_order = await Order_Pydantic.from_tortoise_orm(order)
    rabbit_client.publish_message(
        message=updated_order.dict(),
        message_type="order.updated"
    )
    
    return updated_order


async def delete_order(order_id: int) -> bool:
    """Delete an order."""
    order = await Order.filter(order_id=order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail=f"Order with ID {order_id} not found")
    
    # Get order data before deletion for the message
    order_obj = await Order_Pydantic.from_tortoise_orm(order)
    
    # Delete the order
    await order.delete()
    
    # Publish to RabbitMQ
    rabbit_client.publish_message(
        message={"order_id": order_id, "details": order_obj.dict()},
        message_type="order.deleted"
    )
    
    return True