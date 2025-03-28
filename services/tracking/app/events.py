# app/events.py

import logging
from typing import Dict, Any, Optional
from datetime import datetime
import httpx

from app.services.messaging import RabbitMQService
from app.services.location_service import LocationService
from app.services.order_service import OrderService
from app.db.models import GeoPoint, OrderStatus, DriverStatus, TrackingEvent
from app.websockets.tracking import connection_manager

logger = logging.getLogger(__name__)


class EventHandler:
    """
    Handles events from RabbitMQ and performs appropriate actions.
    """
    
    def __init__(
        self,
        rabbit_service: RabbitMQService,
        location_service: LocationService,
        order_service: OrderService
    ):
        self.rabbit_service = rabbit_service
        self.location_service = location_service
        self.order_service = order_service
        
    async def setup_event_handlers(self):
        """
        Set up event handlers for RabbitMQ events.
        """
        # Subscribe to events
        await self.rabbit_service.subscribe(
            routing_key="order.matched",
            callback=self.handle_order_matched,
            queue_name="tracking_service.order.matched"
        )
        
        await self.rabbit_service.subscribe(
            routing_key="order.created",
            callback=self.handle_order_created,
            queue_name="tracking_service.order.created"
        )
        
        await self.rabbit_service.subscribe(
            routing_key="driver.registered",
            callback=self.handle_driver_registered,
            queue_name="tracking_service.driver.registered"
        )
        
        await self.rabbit_service.subscribe(
            routing_key="order.status.updated",
            callback=self.handle_order_status_updated,
            queue_name="tracking_service.order.status.updated"
        )
        
        logger.info("Set up event handlers for RabbitMQ events")
    
    async def handle_order_matched(self, data: Dict[str, Any]):
        """
        Handle order matched event.
        
        Args:
            data: Event data
        """
        try:
            logger.info(f"Handling order.matched event: {data}")
            
            order_id = data.get("order_id")
            if not order_id:
                logger.warning("Missing order_id in order.matched event")
                return
            
            # Get existing order tracking or create if not exists
            order_tracking = await self.order_service.get_order_tracking(order_id)
            
            if not order_tracking:
                logger.warning(f"Order tracking not found for order {order_id}")
                return
            
            # Update order tracking with driver and vehicle information
            driver_id = data.get("driver_id")
            vehicle_id = data.get("vehicle_id")
            
            if not driver_id or not vehicle_id:
                logger.warning("Missing driver_id or vehicle_id in order.matched event")
                return
            
            # Update order status to MATCHED
            updated_order = await self.order_service.update_order_status(
                order_id=order_id,
                status=OrderStatus.MATCHED,
                driver_id=driver_id,
                vehicle_id=vehicle_id
            )
            
            if not updated_order:
                logger.warning(f"Failed to update order status for order {order_id}")
                return
            
            # Update driver's current order
            await self.location_service.update_driver_order(
                driver_id=driver_id,
                order_id=order_id
            )
            
            # Send order matched notification to the user
            if updated_order.user_id:
                await connection_manager.send_to_user(
                    updated_order.user_id,
                    {
                        "type": "order_matched",
                        "data": self.order_service.format_order_tracking_response(updated_order)
                    }
                )
            
            # Log event
            await TrackingEvent(
                event_type="order_matched",
                order_id=order_id,
                driver_id=driver_id,
                vehicle_id=vehicle_id,
                previous_status=OrderStatus.MATCHING,
                new_status=OrderStatus.MATCHED,
                metadata=data
            ).save()
            
            logger.info(f"Successfully processed order.matched event for order {order_id}")
        
        except Exception as e:
            logger.error(f"Error handling order.matched event: {e}")
    
    async def handle_order_created(self, data: Dict[str, Any]):
        """
        Handle order created event.
        
        Args:
            data: Event data
        """
        try:
            logger.info(f"Handling order.created event: {data}")
            
            order_id = data.get("orderId")  # Note: field name might be different based on publisher
            if not order_id:
                order_id = data.get("order_id")
            
            if not order_id:
                logger.warning("Missing order_id in order.created event")
                return
            
            # Check if order tracking already exists
            existing_order = await self.order_service.get_order_tracking(order_id)
            if existing_order:
                logger.info(f"Order tracking already exists for order {order_id}")
                return
            
            # Extract required data from event
            user_id = data.get("userId") or data.get("user_id")
            
            if not user_id:
                logger.warning("Missing user_id in order.created event")
                return
            
            # Extract pickup and dropoff locations
            pickup_location = data.get("pickupLocation") or data.get("pickup_location")
            dropoff_location = data.get("dropoffLocation") or data.get("dropoff_location")
            
            if not pickup_location or not dropoff_location:
                logger.warning("Missing location data in order.created event")
                return
            
            # Create GeoPoint objects
            pickup_geo = GeoPoint(
                latitude=pickup_location.get("latitude"),
                longitude=pickup_location.get("longitude"),
                timestamp=datetime.utcnow()
            )
            
            dropoff_geo = GeoPoint(
                latitude=dropoff_location.get("latitude"),
                longitude=dropoff_location.get("longitude"),
                timestamp=datetime.utcnow()
            )
            
            # Create order tracking
            order_tracking = await self.order_service.create_order_tracking(
                order_id=order_id,
                user_id=user_id,
                pickup_location=pickup_geo,
                dropoff_location=dropoff_geo,
                status=OrderStatus.PENDING
            )
            
            logger.info(f"Created order tracking for order {order_id}")
        
        except Exception as e:
            logger.error(f"Error handling order.created event: {e}")
    
    async def handle_driver_registered(self, data: Dict[str, Any]):
        """
        Handle driver registered event.
        
        Args:
            data: Event data
        """
        try:
            logger.info(f"Handling driver.registered event: {data}")
            
            driver_id = data.get("driver_id")
            if not driver_id:
                logger.warning("Missing driver_id in driver.registered event")
                return
            
            # Check if driver location already exists
            existing_location = await self.location_service.get_driver_location(driver_id)
            if existing_location:
                logger.info(f"Driver location already exists for driver {driver_id}")
                return
            
            # Create initial driver location with inactive status
            # This will be updated when the driver connects via WebSocket
            
            # If initial location data is provided in the event
            latitude = data.get("latitude")
            longitude = data.get("longitude")
            
            if latitude and longitude:
                geo_point = GeoPoint(
                    latitude=float(latitude),
                    longitude=float(longitude),
                    timestamp=datetime.utcnow()
                )
                
                await self.location_service.update_driver_location(
                    driver_id=driver_id,
                    location=geo_point,
                    status=DriverStatus.INACTIVE
                )
                
                logger.info(f"Created initial location for driver {driver_id}")
            else:
                logger.info(f"No initial location data provided for driver {driver_id}")
            
            # Log event
            await TrackingEvent(
                event_type="driver_registered",
                driver_id=driver_id,
                metadata=data
            ).save()
        
        except Exception as e:
            logger.error(f"Error handling driver.registered event: {e}")
    
    async def handle_order_status_updated(self, data: Dict[str, Any]):
        """
        Handle order status updated event.
        
        Args:
            data: Event data
        """
        try:
            logger.info(f"Handling order.status.updated event: {data}")
            
            order_id = data.get("order_id")
            if not order_id:
                logger.warning("Missing order_id in order.status.updated event")
                return
            
            status = data.get("status")
            if not status:
                logger.warning("Missing status in order.status.updated event")
                return
            
            # Get order tracking
            order_tracking = await self.order_service.get_order_tracking(order_id)
            if not order_tracking:
                logger.warning(f"Order tracking not found for order {order_id}")
                return
            
            # If status is already the same, no need to update
            if order_tracking.status == status:
                logger.info(f"Order {order_id} is already in status {status}")
                return
            
            # Check if the status transition is valid
            try:
                new_status = OrderStatus(status)
            except ValueError:
                logger.warning(f"Invalid order status: {status}")
                return
            
            # Update order status
            previous_status = order_tracking.status
            
            updated_order = await self.order_service.update_order_status(
                order_id=order_id,
                status=new_status
            )
            
            if not updated_order:
                logger.warning(f"Failed to update order status for order {order_id}")
                return
            
            # If status changed to DELIVERED or CANCELLED and driver is assigned
            if (new_status in [OrderStatus.DELIVERED, OrderStatus.CANCELLED]) and updated_order.driver_id:
                # Update driver's current order to null
                await self.location_service.update_driver_order(
                    driver_id=updated_order.driver_id,
                    order_id=None
                )
            
            # Notify via WebSocket
            if updated_order.user_id:
                await connection_manager.send_to_user(
                    updated_order.user_id,
                    {
                        "type": "order_status_change",
                        "data": {
                            "order_id": updated_order.order_id,
                            "status": updated_order.status,
                            "previous_status": previous_status,
                            "timestamp": datetime.utcnow().isoformat(),
                        }
                    }
                )
            
            # Log event
            await TrackingEvent(
                event_type="order_status_updated_from_external",
                order_id=order_id,
                user_id=updated_order.user_id,
                driver_id=updated_order.driver_id,
                vehicle_id=updated_order.vehicle_id,
                previous_status=previous_status,
                new_status=new_status,
                metadata=data
            ).save()
            
            logger.info(f"Successfully processed order.status.updated event for order {order_id}")
        
        except Exception as e:
            logger.error(f"Error handling order.status.updated event: {e}")


async def setup_event_handlers(
    rabbit_service: RabbitMQService,
    location_service: LocationService,
    order_service: OrderService
):
    """
    Set up event handlers for the application.
    
    Args:
        rabbit_service: RabbitMQ service
        location_service: Location service
        order_service: Order service
    """
    event_handler = EventHandler(
        rabbit_service=rabbit_service,
        location_service=location_service,
        order_service=order_service
    )
    
    await event_handler.setup_event_handlers()