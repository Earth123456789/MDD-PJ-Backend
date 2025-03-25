# app/api/routes/websocket.py

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from typing import Optional

from app.websockets.tracking import (
    handle_driver_websocket, 
    handle_user_websocket,
    connection_manager
)
from app.services.location_service import LocationService
from app.services.order_service import OrderService
from app.services.messaging import RabbitMQService

router = APIRouter()


@router.websocket("/driver")
async def driver_websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    location_service: LocationService = Depends(),
    order_service: OrderService = Depends(),
    rabbit_service: RabbitMQService = Depends()
):
    """
    WebSocket endpoint for drivers to send real-time location updates.
    
    This endpoint establishes a persistent WebSocket connection for drivers
    to continuously transmit their location and receive updates about orders.
    """
    try:
        await handle_driver_websocket(
            websocket=websocket,
            driver_token=token,
            location_service=location_service,
            order_service=order_service,
            rabbit_service=rabbit_service
        )
    except WebSocketDisconnect:
        # This is handled in the handle_driver_websocket function
        pass


@router.websocket("/user")
async def user_websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    order_id: Optional[int] = Query(None),
    location_service: LocationService = Depends(),
    order_service: OrderService = Depends()
):
    """
    WebSocket endpoint for users to receive real-time order tracking updates.
    
    This endpoint establishes a persistent WebSocket connection for users
    to receive updates about their orders, including driver location and
    order status changes.
    """
    try:
        await handle_user_websocket(
            websocket=websocket,
            user_token=token,
            order_id=order_id,
            location_service=location_service,
            order_service=order_service
        )
    except WebSocketDisconnect:
        # This is handled in the handle_user_websocket function
        pass


@router.websocket("/admin")
async def admin_websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    location_service: LocationService = Depends(),
    order_service: OrderService = Depends()
):
    """
    WebSocket endpoint for admin dashboard to receive real-time system updates.
    
    This endpoint establishes a persistent WebSocket connection for admin
    dashboards to monitor all activity in the system, including driver
    locations, order status changes, and other events.
    """
    # In a real implementation, this would verify admin privileges
    # For now, we'll handle it similar to the user endpoint
    try:
        await handle_user_websocket(
            websocket=websocket,
            user_token=token,
            location_service=location_service,
            order_service=order_service
        )
    except WebSocketDisconnect:
        # This is handled in the handle_user_websocket function
        pass


@router.get("/connections/stats")
async def get_connection_stats():
    """
    Get statistics about current WebSocket connections.
    
    This endpoint provides information about the number of active
    WebSocket connections, broken down by type (driver, user, admin).
    """
    # Count active connections by type
    total_connections = len(connection_manager.active_connections)
    driver_connections = sum(len(conns) for conns in connection_manager.driver_connections.values())
    user_connections = sum(len(conns) for conns in connection_manager.user_connections.values())
    order_subscriptions = sum(len(conns) for conns in connection_manager.order_subscribers.values())
    
    return {
        "total_connections": total_connections,
        "driver_connections": driver_connections,
        "user_connections": user_connections,
        "order_subscriptions": order_subscriptions,
        "active_drivers": len(connection_manager.driver_connections),
        "active_users": len(connection_manager.user_connections),
        "orders_with_subscribers": len(connection_manager.order_subscribers)
    }