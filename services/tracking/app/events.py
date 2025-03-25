# app/events.py

import logging
from typing import Dict, Any

from app.services.messaging import RabbitMQService
from app.services.location_service import LocationService
from app.services.order_service import OrderService

logger = logging.getLogger(__name__)


async def handle_driver_location_updated(
    message: Dict[str, Any],
    location_service: LocationService,
    order_service: OrderService
):
    """
    Handle driver location update events.
    
    Args:
        message: Parsed message from RabbitMQ
        location_service: LocationService instance
        order_service: OrderService instance
    """
    try:
        driver_id = message.get('driver_id')
        latitude = message.get('latitude')
        longitude = message.get('longitude')
        timestamp = message.get('timestamp')
        current_order_id = message.get('current_order_id')
        status = message.get('status')
        
        logger.info(f"Processing location update for driver {driver_id}")
        
        # Add additional processing logic here if needed
        # For example, triggering notifications, logging, etc.
    except Exception as e:
        logger.error(f"Error processing driver location update: {e}")


async def handle_order_status_change(
    message: Dict[str, Any], 
    order_service: OrderService
):
    """
    Handle order status change events.
    
    Args:
        message: Parsed message from RabbitMQ
        order_service: OrderService instance
    """
    try:
        order_id = message.get('order_id')
        status = message.get('status')
        
        logger.info(f"Processing status change for order {order_id}: {status}")
        
        # Add additional processing logic here if needed
        # For example, triggering notifications, logging, etc.
    except Exception as e:
        logger.error(f"Error processing order status change: {e}")


async def setup_event_handlers(
    rabbit_service: RabbitMQService,
    location_service: LocationService,
    order_service: OrderService
):
    """
    Setup RabbitMQ event handlers.
    
    Args:
        rabbit_service: RabbitMQService instance
        location_service: LocationService instance
        order_service: OrderService instance
    """
    try:
        # Subscribe to driver location updates
        await rabbit_service.subscribe(
            "driver.location.updated",
            lambda msg: handle_driver_location_updated(msg, location_service, order_service)
        )
        
        # Subscribe to order status changes
        await rabbit_service.subscribe(
            "order.status.changed",
            lambda msg: handle_order_status_change(msg, order_service)
        )
        
        logger.info("Event handlers setup complete")
    
    except Exception as e:
        logger.error(f"Error setting up event handlers: {e}")
        raise