import json
import logging
import asyncio
import uuid
from typing import Dict, Optional, Any
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from pydantic import ValidationError

from app.config import get_settings
from app.websockets.manager import ConnectionManager, WebSocketMessage
from app.db.models import DriverLocation, GeoPoint, TrackingEvent, OrderTracking, DriverStatus
from app.services.location_service import LocationService
from app.services.order_service import OrderService
from app.services.messaging import RabbitMQService

settings = get_settings()
logger = logging.getLogger(__name__)

# Create a global connection manager
connection_manager = ConnectionManager()

# Simple token parsing for development mode (no real auth)
async def parse_token(token: str, is_driver: bool = False) -> str:
    """
    Simple token parsing that doesn't require real auth.
    Just extracts user or driver ID from the token for development.
    
    Args:
        token: The token string
        is_driver: Whether to parse as a driver
        
    Returns:
        ID extracted from token
    """
    try:
        # For development, just use token as ID
        return token
    except Exception as e:
        logger.warning(f"Token parsing error: {e}")
        # For development, just create a dummy ID if token parsing fails
        if is_driver:
            return f"driver-{uuid.uuid4()}"
        else:
            return f"user-{uuid.uuid4()}"


async def handle_driver_websocket(
    websocket: WebSocket,
    driver_token: str,
    location_service: LocationService,
    order_service: OrderService,
    rabbit_service: RabbitMQService
):
    """
    Handle WebSocket connection for a driver.
    
    This function:
    1. Parses the driver's token to get driver ID (no auth)
    2. Establishes a persistent WebSocket connection 
    3. Listens for location updates and other driver events
    4. Processes location updates and order status changes
    5. Broadcasts location updates to relevant users
    """
    connection_id = str(uuid.uuid4())
    
    try:
        # Get driver ID from token (simplified, no auth)
        driver_id = await parse_token(driver_token, is_driver=True)
        
        # Accept the WebSocket connection
        client_headers = dict(websocket.headers)
        user_agent = client_headers.get("user-agent", "")
        client_host = websocket.client.host
        
        await connection_manager.connect(
            websocket=websocket,
            connection_id=connection_id,
            client_type="driver",
            driver_id=driver_id,
            user_agent=user_agent,
            ip_address=client_host,
        )
        
        # Send welcome message
        await websocket.send_json({
            "type": "connected",
            "data": {
                "connection_id": connection_id,
                "driver_id": driver_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        })
        
        # Start heartbeat task if not already running
        await connection_manager.start_heartbeat()
        
        # Main WebSocket loop
        while True:
            # Wait for messages from the driver
            message_raw = await websocket.receive_text()
            
            try:
                # Parse the message
                message_data = json.loads(message_raw)
                message_type = message_data.get("type", "")
                
                # Handle different message types
                if message_type == "location_update":
                    await handle_location_update(
                        driver_id=driver_id, 
                        data=message_data.get("data", {}),
                        location_service=location_service,
                        order_service=order_service,
                        rabbit_service=rabbit_service
                    )
                
                elif message_type == "status_update":
                    await handle_status_update(
                        driver_id=driver_id, 
                        data=message_data.get("data", {}),
                        location_service=location_service,
                        rabbit_service=rabbit_service
                    )
                
                elif message_type == "order_status_update":
                    await handle_order_status_update(
                        driver_id=driver_id, 
                        data=message_data.get("data", {}),
                        order_service=order_service,
                        rabbit_service=rabbit_service
                    )
                
                elif message_type == "heartbeat_response":
                    # Just log it for debugging
                    logger.debug(f"Received heartbeat response from driver {driver_id}")
                
                else:
                    # Unknown message type
                    logger.warning(f"Unknown message type from driver {driver_id}: {message_type}")
                    await websocket.send_json({
                        "type": "error",
                        "data": {
                            "message": f"Unknown message type: {message_type}"
                        }
                    })
            
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON from driver {driver_id}: {message_raw}")
                await websocket.send_json({
                    "type": "error",
                    "data": {
                        "message": "Invalid JSON"
                    }
                })
            
            except ValidationError as e:
                logger.warning(f"Validation error from driver {driver_id}: {e}")
                await websocket.send_json({
                    "type": "error",
                    "data": {
                        "message": f"Validation error: {e}"
                    }
                })
            
            except Exception as e:
                logger.error(f"Error processing message from driver {driver_id}: {e}")
                await websocket.send_json({
                    "type": "error",
                    "data": {
                        "message": "Server error"
                    }
                })
    
    except WebSocketDisconnect:
        # Clean up on disconnect
        await connection_manager.disconnect(connection_id)
    
    except HTTPException as e:
        # Handle errors
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason=e.detail)
    
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        except:
            pass
        await connection_manager.disconnect(connection_id)


async def handle_user_websocket(
    websocket: WebSocket,
    user_token: str,
    order_id: Optional[str] = None,
    location_service: LocationService = None,
    order_service: OrderService = None,
):
    """
    Handle WebSocket connection for a user.
    
    This function:
    1. Parses the user's token to get user ID (no auth)
    2. Establishes a persistent WebSocket connection
    3. Subscribes the user to updates for a specific order if provided
    4. Sends real-time location and status updates for the order
    """
    connection_id = str(uuid.uuid4())
    
    try:
        # Get user ID from token (simplified, no auth)
        user_id = await parse_token(user_token)
        
        # Accept the WebSocket connection
        client_headers = dict(websocket.headers)
        user_agent = client_headers.get("user-agent", "")
        client_host = websocket.client.host
        
        await connection_manager.connect(
            websocket=websocket,
            connection_id=connection_id,
            client_type="user",
            user_id=user_id,
            user_agent=user_agent,
            ip_address=client_host,
        )
        
        # Send welcome message
        await websocket.send_json({
            "type": "connected",
            "data": {
                "connection_id": connection_id,
                "user_id": user_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        })
        
        # Subscribe to order updates if order_id is provided
        if order_id:
            # Verify that this order belongs to the user
            order = await order_service.get_order_tracking(order_id)
            if order and order.user_id == user_id:
                await connection_manager.subscribe_to_order(connection_id, order_id)
                
                # Send initial order status
                await websocket.send_json({
                    "type": "order_status",
                    "data": order_service.format_order_tracking_response(order)
                })
            else:
                await websocket.send_json({
                    "type": "error",
                    "data": {
                        "message": f"Order {order_id} not found or not authorized"
                    }
                })
        
        # Start heartbeat task if not already running
        await connection_manager.start_heartbeat()
        
        # Main WebSocket loop
        while True:
            # Wait for messages from the user
            message_raw = await websocket.receive_text()
            
            try:
                # Parse the message
                message_data = json.loads(message_raw)
                message_type = message_data.get("type", "")
                
                # Handle different message types
                if message_type == "subscribe_order":
                    # User wants to subscribe to a specific order
                    order_id = message_data.get("data", {}).get("order_id")
                    if order_id:
                        order = await order_service.get_order_tracking(order_id)
                        if order and order.user_id == user_id:
                            await connection_manager.subscribe_to_order(connection_id, order_id)
                            await websocket.send_json({
                                "type": "subscribed",
                                "data": {
                                    "order_id": order_id,
                                    "status": order.status
                                }
                            })
                            
                            # Send current order status
                            await websocket.send_json({
                                "type": "order_status",
                                "data": order_service.format_order_tracking_response(order)
                            })
                        else:
                            await websocket.send_json({
                                "type": "error",
                                "data": {
                                    "message": f"Order {order_id} not found or not authorized"
                                }
                            })
                
                elif message_type == "unsubscribe_order":
                    # User wants to unsubscribe from a specific order
                    order_id = message_data.get("data", {}).get("order_id")
                    if order_id:
                        await connection_manager.unsubscribe_from_order(connection_id, order_id)
                        await websocket.send_json({
                            "type": "unsubscribed",
                            "data": {
                                "order_id": order_id
                            }
                        })
                
                elif message_type == "get_order_map_data":
                    # User wants Google Maps formatted data for an order
                    order_id = message_data.get("data", {}).get("order_id")
                    if order_id:
                        order = await order_service.get_order_tracking(order_id)
                        if order and order.user_id == user_id:
                            # Get map data
                            map_data = await order_service.format_order_for_google_maps(order_id)
                            await websocket.send_json({
                                "type": "order_map_data",
                                "data": map_data
                            })
                        else:
                            await websocket.send_json({
                                "type": "error",
                                "data": {
                                    "message": f"Order {order_id} not found or not authorized"
                                }
                            })
                
                elif message_type == "heartbeat_response":
                    # Just log it for debugging
                    logger.debug(f"Received heartbeat response from user {user_id}")
                
                else:
                    # Unknown message type
                    logger.warning(f"Unknown message type from user {user_id}: {message_type}")
                    await websocket.send_json({
                        "type": "error",
                        "data": {
                            "message": f"Unknown message type: {message_type}"
                        }
                    })
            
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON from user {user_id}: {message_raw}")
                await websocket.send_json({
                    "type": "error",
                    "data": {
                        "message": "Invalid JSON"
                    }
                })
            
            except ValidationError as e:
                logger.warning(f"Validation error from user {user_id}: {e}")
                await websocket.send_json({
                    "type": "error",
                    "data": {
                        "message": f"Validation error: {e}"
                    }
                })
            
            except Exception as e:
                logger.error(f"Error processing message from user {user_id}: {e}")
                await websocket.send_json({
                    "type": "error",
                    "data": {
                        "message": "Server error"
                    }
                })
    
    except WebSocketDisconnect:
        # Clean up on disconnect
        await connection_manager.disconnect(connection_id)
    
    except HTTPException as e:
        # Handle errors
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason=e.detail)
    
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        except:
            pass
        await connection_manager.disconnect(connection_id)


async def handle_location_update(
    driver_id: str,
    data: Dict[str, Any],
    location_service: LocationService,
    order_service: OrderService,
    rabbit_service: RabbitMQService
):
    """
    Process a location update from a driver.
    
    Args:
        driver_id: The ID of the driver
        data: The location data
        location_service: LocationService instance
        order_service: OrderService instance
        rabbit_service: RabbitMQService instance
    """
    try:
        # Extract location data
        latitude = data.get("latitude")
        longitude = data.get("longitude")
        
        if latitude is None or longitude is None:
            logger.warning(f"Invalid location data from driver {driver_id}: {data}")
            return
        
        # Create new location point
        geo_point = GeoPoint(
            latitude=latitude,
            longitude=longitude,
            accuracy=data.get("accuracy"),
            altitude=data.get("altitude"),
            timestamp=datetime.utcnow(),
            metadata={
                "heading": data.get("heading"),
                "speed": data.get("speed"),
                "battery_level": data.get("battery_level"),
            }
        )
        
        # Update driver location
        driver_location = await location_service.update_driver_location(
            driver_id=driver_id,
            location=geo_point,
            heading=data.get("heading"),
            speed=data.get("speed"),
            battery_level=data.get("battery_level"),
        )
        
        # Check if driver has an active order
        if driver_location.current_order_id:
            # Update order tracking with new location
            order = await order_service.update_order_location(
                order_id=driver_location.current_order_id,
                location=geo_point,
            )
            
            # If order exists, broadcast update to subscribers
            if order:
                # Format order tracking response
                order_data = order_service.format_order_tracking_response(order)
                
                # Send to order subscribers
                await connection_manager.broadcast_order_update(
                    order.order_id,
                    {
                        "type": "location_update",
                        "data": order_data
                    }
                )
                
                # Also notify the user directly
                if order.user_id:
                    await connection_manager.send_to_user(
                        order.user_id,
                        {
                            "type": "driver_location",
                            "data": {
                                "order_id": order.order_id,
                                "driver_id": driver_id,
                                "latitude": latitude,
                                "longitude": longitude,
                                "heading": data.get("heading"),
                                "speed": data.get("speed"),
                                "timestamp": datetime.utcnow().isoformat(),
                            }
                        }
                    )
        
        # Publish location update to RabbitMQ for other services
        await rabbit_service.publish_message(
            "driver.location.updated",
            {
                "driver_id": driver_id,
                "latitude": latitude,
                "longitude": longitude,
                "heading": data.get("heading"),
                "speed": data.get("speed"),
                "timestamp": datetime.utcnow().isoformat(),
                "current_order_id": driver_location.current_order_id,
                "status": driver_location.status,
            }
        )
        
        # Log the event
        await TrackingEvent(
            event_type="driver_location_updated",
            driver_id=driver_id,
            order_id=driver_location.current_order_id,
            location=geo_point,
        ).save()
    
    except Exception as e:
        logger.error(f"Error processing location update from driver {driver_id}: {e}")


async def handle_status_update(
    driver_id: str,
    data: Dict[str, Any],
    location_service: LocationService,
    rabbit_service: RabbitMQService
):
    """
    Process a status update from a driver.
    
    Args:
        driver_id: The ID of the driver
        data: The status data
        location_service: LocationService instance
        rabbit_service: RabbitMQService instance
    """
    try:
        # Extract status data
        status = data.get("status")
        
        if not status:
            logger.warning(f"Invalid status data from driver {driver_id}: {data}")
            return
        
        # Validate status
        try:
            driver_status = DriverStatus(status)
        except ValueError:
            logger.warning(f"Invalid driver status: {status}")
            return
        
        # Update driver status
        previous_status = None
        driver_location = await location_service.get_driver_location(driver_id)
        if driver_location:
            previous_status = driver_location.status
            driver_location.status = driver_status
            driver_location.updated_at = datetime.utcnow()
            await driver_location.save()
        
        # Publish status update to RabbitMQ for other services
        await rabbit_service.publish_message(
            "driver.status.updated",
            {
                "driver_id": driver_id,
                "previous_status": previous_status,
                "status": status,
                "timestamp": datetime.utcnow().isoformat(),
                "current_order_id": driver_location.current_order_id if driver_location else None,
            }
        )
        
        # Log the event
        await TrackingEvent(
            event_type="driver_status_updated",
            driver_id=driver_id,
            previous_status=previous_status,
            new_status=status,
        ).save()
        
        # If driver became active, notify them about available orders
        if previous_status != DriverStatus.ACTIVE and driver_status == DriverStatus.ACTIVE:
            # This would be implemented in a real system to push new orders to the driver
            pass
    
    except Exception as e:
        logger.error(f"Error processing status update from driver {driver_id}: {e}")


async def handle_order_status_update(
    driver_id: str,
    data: Dict[str, Any],
    order_service: OrderService,
    rabbit_service: RabbitMQService
):
    """
    Process an order status update from a driver.
    
    Args:
        driver_id: The ID of the driver
        data: The order status data
        order_service: OrderService instance
        rabbit_service: RabbitMQService instance
    """
    try:
        # Extract order data
        order_id = data.get("order_id")
        status = data.get("status")
        
        if not order_id or not status:
            logger.warning(f"Invalid order status data from driver {driver_id}: {data}")
            return
        
        # Get current order tracking
        order = await order_service.get_order_tracking(order_id)
        
        if not order:
            logger.warning(f"Order {order_id} not found for driver {driver_id}")
            return
        
        # Verify the driver is authorized to update this order
        if order.driver_id != driver_id:
            logger.warning(f"Driver {driver_id} not authorized to update order {order_id}")
            return
        
        # Validate the requested status change
        previous_status = order.status
        
        # Process specific status transitions
        if status == "DELIVERED" and previous_status == "IN_TRANSIT":
            # Update order to delivered
            updated_order = await order_service.mark_order_delivered(
                order_id=order_id,
                driver_id=driver_id,
                location=GeoPoint(
                    latitude=data.get("latitude", 0),
                    longitude=data.get("longitude", 0),
                    timestamp=datetime.utcnow()
                ) if "latitude" in data and "longitude" in data else None
            )
            
            if updated_order:
                # Format order response
                order_data = order_service.format_order_tracking_response(updated_order)
                
                # Notify order subscribers
                await connection_manager.broadcast_order_update(
                    order_id,
                    {
                        "type": "order_delivered",
                        "data": order_data
                    }
                )
                
                # Notify the user directly
                if updated_order.user_id:
                    await connection_manager.send_to_user(
                        updated_order.user_id,
                        {
                            "type": "order_status_change",
                            "data": {
                                "order_id": order_id,
                                "status": "DELIVERED",
                                "previous_status": previous_status,
                                "timestamp": datetime.utcnow().isoformat(),
                            }
                        }
                    )
                
                # Publish to RabbitMQ for other services
                await rabbit_service.publish_message(
                    "order.delivered",
                    {
                        "order_id": order_id,
                        "driver_id": driver_id,
                        "previous_status": previous_status,
                        "status": "DELIVERED",
                        "timestamp": datetime.utcnow().isoformat(),
                    }
                )
                
                # Log the event
                await TrackingEvent(
                    event_type="order_delivered",
                    driver_id=driver_id,
                    order_id=order_id,
                    previous_status=previous_status,
                    new_status="DELIVERED",
                ).save()
        
        elif status == "IN_TRANSIT" and previous_status == "MATCHED":
            # Update order to in_transit
            updated_order = await order_service.mark_order_in_transit(
                order_id=order_id,
                driver_id=driver_id
            )
            
            if updated_order:
                # Format order response
                order_data = order_service.format_order_tracking_response(updated_order)
                
                # Notify order subscribers
                await connection_manager.broadcast_order_update(
                    order_id,
                    {
                        "type": "order_in_transit",
                        "data": order_data
                    }
                )
                
                # Notify the user directly
                if updated_order.user_id:
                    await connection_manager.send_to_user(
                        updated_order.user_id,
                        {
                            "type": "order_status_change",
                            "data": {
                                "order_id": order_id,
                                "status": "IN_TRANSIT",
                                "previous_status": previous_status,
                                "timestamp": datetime.utcnow().isoformat(),
                            }
                        }
                    )
                
                # Publish to RabbitMQ for other services
                await rabbit_service.publish_message(
                    "order.in_transit",
                    {
                        "order_id": order_id,
                        "driver_id": driver_id,
                        "previous_status": previous_status,
                        "status": "IN_TRANSIT",
                        "timestamp": datetime.utcnow().isoformat(),
                    }
                )
                
                # Log the event
                await TrackingEvent(
                    event_type="order_in_transit",
                    driver_id=driver_id,
                    order_id=order_id,
                    previous_status=previous_status,
                    new_status="IN_TRANSIT",
                ).save()
        
        else:
            logger.warning(f"Invalid status transition for order {order_id}: {previous_status} -> {status}")
    
    except Exception as e:
        logger.error(f"Error processing order status update from driver {driver_id}: {e}")