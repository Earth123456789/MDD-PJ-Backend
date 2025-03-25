import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from geopy.distance import geodesic

from app.config import get_settings
from app.db.models import (
    OrderTracking, 
    GeoPoint, 
    OrderStatus,
    TrackingEvent
)

settings = get_settings()
logger = logging.getLogger(__name__)


class OrderService:
    """
    Service for handling order tracking data.
    """
    
    async def create_order_tracking(
        self,
        order_id: int,
        user_id: int,
        pickup_location: GeoPoint,
        dropoff_location: GeoPoint,
        driver_id: Optional[int] = None,
        vehicle_id: Optional[int] = None,
        status: OrderStatus = OrderStatus.PENDING
    ) -> OrderTracking:
        """
        Create tracking for a new order.
        
        Args:
            order_id: The ID of the order
            user_id: The ID of the user who placed the order
            pickup_location: The pickup location
            dropoff_location: The dropoff location
            driver_id: Optional ID of the assigned driver
            vehicle_id: Optional ID of the assigned vehicle
            status: The initial status of the order
            
        Returns:
            The created order tracking
        """
        # Save the geo points
        saved_pickup = await pickup_location.save()
        saved_dropoff = await dropoff_location.save()
        
        # Calculate estimated arrival time based on distance
        distance_km = geodesic(
            (pickup_location.latitude, pickup_location.longitude),
            (dropoff_location.latitude, dropoff_location.longitude)
        ).km
        
        # Assume average speed of 30 km/h
        travel_time_hours = distance_km / 30
        
        # Add some buffer time for pickup
        estimated_arrival = datetime.utcnow() + timedelta(hours=travel_time_hours) + timedelta(minutes=15)
        
        # Create order tracking
        order_tracking = OrderTracking(
            order_id=order_id,
            user_id=user_id,
            driver_id=driver_id,
            vehicle_id=vehicle_id,
            status=status,
            pickup_location=saved_pickup,
            dropoff_location=saved_dropoff,
            estimated_arrival_time=estimated_arrival,
            distance_traveled=0
        )
        
        # Save to database
        await order_tracking.save()
        
        # Log creation event
        await TrackingEvent(
            event_type="order_tracking_created",
            order_id=order_id,
            user_id=user_id,
            driver_id=driver_id,
            vehicle_id=vehicle_id,
            metadata={
                "status": status,
                "distance_km": round(distance_km, 2),
                "estimated_arrival": estimated_arrival.isoformat()
            }
        ).save()
        
        return order_tracking
    
    async def get_order_tracking(self, order_id: int) -> Optional[OrderTracking]:
        """
        Get tracking for an order.
        
        Args:
            order_id: The ID of the order
            
        Returns:
            The order tracking or None if not found
        """
        return await OrderTracking.find_one({"order_id": order_id})
    
    async def update_order_location(
        self,
        order_id: int,
        location: GeoPoint
    ) -> Optional[OrderTracking]:
        """
        Update the current location of an order in transit.
        
        Args:
            order_id: The ID of the order
            location: The current location
            
        Returns:
            The updated order tracking or None if not found
        """
        # Save the geo point
        saved_location = await location.save()
        
        # Find order tracking
        order = await OrderTracking.find_one({"order_id": order_id})
        
        if not order:
            return None
        
        # Only update if order is in transit
        if order.status != OrderStatus.IN_TRANSIT:
            return order
        
        # Calculate distance traveled if we have previous location
        if order.current_location:
            old_coords = (order.current_location.latitude, order.current_location.longitude)
            new_coords = (location.latitude, location.longitude)
            
            # Calculate distance in kilometers
            distance = geodesic(old_coords, new_coords).km
            
            # Update total distance traveled
            order.distance_traveled = (order.distance_traveled or 0) + distance
        
        # Update current location
        order.current_location = saved_location
        
        # Update estimated arrival time based on distance to dropoff
        if order.dropoff_location:
            # Calculate remaining distance
            current_coords = (location.latitude, location.longitude)
            dropoff_coords = (order.dropoff_location.latitude, order.dropoff_location.longitude)
            
            remaining_distance = geodesic(current_coords, dropoff_coords).km
            
            # Assume average speed of 30 km/h
            travel_time_hours = remaining_distance / 30
            
            # Update estimated arrival time
            order.estimated_arrival_time = datetime.utcnow() + timedelta(hours=travel_time_hours)
        
        # Save updates
        order.updated_at = datetime.utcnow()
        await order.save()
        
        # Log event
        await TrackingEvent(
            event_type="order_location_updated",
            order_id=order_id,
            driver_id=order.driver_id,
            vehicle_id=order.vehicle_id,
            location=saved_location,
            metadata={
                "distance_traveled": order.distance_traveled,
                "estimated_arrival": order.estimated_arrival_time.isoformat() if order.estimated_arrival_time else None
            }
        ).save()
        
        return order
    
    async def update_order_status(
        self,
        order_id: int,
        status: OrderStatus,
        driver_id: Optional[int] = None,
        vehicle_id: Optional[int] = None,
        location: Optional[GeoPoint] = None,
    ) -> Optional[OrderTracking]:
        """
        Update the status of an order.
        
        Args:
            order_id: The ID of the order
            status: The new status
            driver_id: Optional ID of the driver (for assignment)
            vehicle_id: Optional ID of the vehicle (for assignment)
            location: Optional current location
            
        Returns:
            The updated order tracking or None if not found
        """
        # Find order tracking
        order = await OrderTracking.find_one({"order_id": order_id})
        
        if not order:
            return None
        
        # Save previous status for event logging
        previous_status = order.status
        
        # Validate status transition
        if not self._is_valid_status_transition(previous_status, status):
            logger.warning(f"Invalid status transition for order {order_id}: {previous_status} -> {status}")
            return order
        
        # Save the geo point if provided
        saved_location = None
        if location:
            saved_location = await location.save()
            order.current_location = saved_location
        
        # Update order status
        order.status = status
        
        # If transitioning to MATCHED, update driver and vehicle
        if status == OrderStatus.MATCHED and previous_status in [OrderStatus.PENDING, OrderStatus.MATCHING]:
            if driver_id is not None:
                order.driver_id = driver_id
            
            if vehicle_id is not None:
                order.vehicle_id = vehicle_id
        
        # If transitioning to IN_TRANSIT, record start time
        if status == OrderStatus.IN_TRANSIT and previous_status == OrderStatus.MATCHED:
            order.started_at = datetime.utcnow()
        
        # If transitioning to DELIVERED, record completion time
        if status == OrderStatus.DELIVERED and previous_status == OrderStatus.IN_TRANSIT:
            order.completed_at = datetime.utcnow()
            
            # Use the actual arrival time for the estimated arrival time
            order.actual_arrival_time = datetime.utcnow()
        
        # Save updates
        order.updated_at = datetime.utcnow()
        await order.save()
        
        # Log event
        await TrackingEvent(
            event_type="order_status_updated",
            order_id=order_id,
            user_id=order.user_id,
            driver_id=order.driver_id,
            vehicle_id=order.vehicle_id,
            location=saved_location,
            previous_status=previous_status,
            new_status=status,
            metadata={
                "started_at": order.started_at.isoformat() if order.started_at else None,
                "completed_at": order.completed_at.isoformat() if order.completed_at else None,
                "distance_traveled": order.distance_traveled
            }
        ).save()
        
        return order
    
    async def mark_order_in_transit(
        self,
        order_id: int,
        driver_id: int
    ) -> Optional[OrderTracking]:
        """
        Mark an order as in transit.
        
        Args:
            order_id: The ID of the order
            driver_id: The ID of the driver
            
        Returns:
            The updated order tracking or None if not found
        """
        # Find order tracking
        order = await OrderTracking.find_one({"order_id": order_id})
        
        if not order:
            return None
        
        # Validate that this driver is assigned to this order
        if order.driver_id != driver_id:
            logger.warning(f"Driver {driver_id} not authorized to update order {order_id}")
            return None
        
        # Validate current status
        if order.status != OrderStatus.MATCHED:
            logger.warning(f"Cannot mark order {order_id} as in transit: current status is {order.status}")
            return order
        
        # Update status to IN_TRANSIT
        return await self.update_order_status(
            order_id=order_id,
            status=OrderStatus.IN_TRANSIT
        )
    
    async def mark_order_delivered(
        self,
        order_id: int,
        driver_id: int,
        location: Optional[GeoPoint] = None
    ) -> Optional[OrderTracking]:
        """
        Mark an order as delivered.
        
        Args:
            order_id: The ID of the order
            driver_id: The ID of the driver
            location: Optional delivery location
            
        Returns:
            The updated order tracking or None if not found
        """
        # Find order tracking
        order = await OrderTracking.find_one({"order_id": order_id})
        
        if not order:
            return None
        
        # Validate that this driver is assigned to this order
        if order.driver_id != driver_id:
            logger.warning(f"Driver {driver_id} not authorized to update order {order_id}")
            return None
        
        # Validate current status
        if order.status != OrderStatus.IN_TRANSIT:
            logger.warning(f"Cannot mark order {order_id} as delivered: current status is {order.status}")
            return order
        
        # Update status to DELIVERED
        return await self.update_order_status(
            order_id=order_id,
            status=OrderStatus.DELIVERED,
            location=location
        )
    
    async def cancel_order(
        self,
        order_id: int,
        user_id: Optional[int] = None,
        driver_id: Optional[int] = None
    ) -> Optional[OrderTracking]:
        """
        Cancel an order.
        
        Args:
            order_id: The ID of the order
            user_id: Optional ID of the user cancelling (for authorization)
            driver_id: Optional ID of the driver cancelling (for authorization)
            
        Returns:
            The updated order tracking or None if not found
        """
        # Find order tracking
        order = await OrderTracking.find_one({"order_id": order_id})
        
        if not order:
            return None
        
        # Validate authorization
        if user_id is not None and order.user_id != user_id:
            logger.warning(f"User {user_id} not authorized to cancel order {order_id}")
            return None
        
        if driver_id is not None and order.driver_id != driver_id:
            logger.warning(f"Driver {driver_id} not authorized to cancel order {order_id}")
            return None
        
        # Validate current status (can't cancel if already delivered or cancelled)
        if order.status in [OrderStatus.DELIVERED, OrderStatus.CANCELLED]:
            logger.warning(f"Cannot cancel order {order_id}: current status is {order.status}")
            return order
        
        # Update status to CANCELLED
        return await self.update_order_status(
            order_id=order_id,
            status=OrderStatus.CANCELLED
        )
    
    def _is_valid_status_transition(self, current: OrderStatus, new: OrderStatus) -> bool:
        """
        Check if a status transition is valid.
        
        Args:
            current: The current status
            new: The new status
            
        Returns:
            True if the transition is valid, False otherwise
        """
        # Define valid transitions
        valid_transitions = {
            OrderStatus.PENDING: [OrderStatus.MATCHING, OrderStatus.CANCELLED],
            OrderStatus.MATCHING: [OrderStatus.MATCHED, OrderStatus.PENDING, OrderStatus.CANCELLED],
            OrderStatus.MATCHED: [OrderStatus.IN_TRANSIT, OrderStatus.CANCELLED],
            OrderStatus.IN_TRANSIT: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
            OrderStatus.DELIVERED: [],  # Terminal state
            OrderStatus.CANCELLED: [],  # Terminal state
        }
        
        return new in valid_transitions.get(current, [])
    
    def format_order_tracking_response(self, order: OrderTracking) -> Dict[str, Any]:
        """
        Format order tracking for response.
        
        Args:
            order: The order tracking
            
        Returns:
            Formatted response
        """
        response = {
            "order_id": order.order_id,
            "user_id": order.user_id,
            "driver_id": order.driver_id,
            "vehicle_id": order.vehicle_id,
            "status": order.status,
            "pickup_location": {
                "latitude": order.pickup_location.latitude,
                "longitude": order.pickup_location.longitude,
                "timestamp": order.pickup_location.timestamp.isoformat(),
            },
            "dropoff_location": {
                "latitude": order.dropoff_location.latitude,
                "longitude": order.dropoff_location.longitude,
                "timestamp": order.dropoff_location.timestamp.isoformat(),
            },
            "estimated_arrival_time": order.estimated_arrival_time.isoformat() if order.estimated_arrival_time else None,
            "actual_arrival_time": order.actual_arrival_time.isoformat() if order.actual_arrival_time else None,
            "distance_traveled": order.distance_traveled,
            "started_at": order.started_at.isoformat() if order.started_at else None,
            "completed_at": order.completed_at.isoformat() if order.completed_at else None,
            "created_at": order.created_at.isoformat(),
            "updated_at": order.updated_at.isoformat(),
        }
        
        # Add current location if available
        if order.current_location:
            response["current_location"] = {
                "latitude": order.current_location.latitude,
                "longitude": order.current_location.longitude,
                "timestamp": order.current_location.timestamp.isoformat(),
            }
        
        # Calculate remaining distance and time if in transit
        if order.status == OrderStatus.IN_TRANSIT and order.current_location and order.dropoff_location:
            current_coords = (order.current_location.latitude, order.current_location.longitude)
            dropoff_coords = (order.dropoff_location.latitude, order.dropoff_location.longitude)
            
            remaining_distance = geodesic(current_coords, dropoff_coords).km
            
            # Calculate remaining time assuming 30 km/h average speed
            remaining_time_minutes = int(remaining_distance / 30 * 60)
            
            response["distance_remaining"] = round(remaining_distance, 2)
            response["time_remaining_minutes"] = remaining_time_minutes
            
            # Calculate progress percentage
            if order.distance_traveled is not None:
                # Calculate total expected distance
                pickup_coords = (order.pickup_location.latitude, order.pickup_location.longitude)
                total_expected_distance = geodesic(pickup_coords, dropoff_coords).km
                
                # Calculate progress
                progress = min(100, (order.distance_traveled / total_expected_distance * 100))
                response["progress_percentage"] = round(progress, 1)
        
        return response
    
    async def get_nearby_orders(
        self,
        latitude: float,
        longitude: float,
        radius: float = 5.0,  # in kilometers
        status: Optional[OrderStatus] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Find orders near a specific location.
        
        Args:
            latitude: The latitude coordinate
            longitude: The longitude coordinate
            radius: Search radius in kilometers
            status: Optional filter by order status
            limit: Maximum number of orders to return
            
        Returns:
            List of orders with distances
        """
        # Find orders, optionally filtered by status
        query = {}
        if status:
            query["status"] = status
        
        orders = await OrderTracking.find(query).to_list()
        
        # Calculate distance for each order
        nearby_orders = []
        
        for order in orders:
            # For PENDING orders, use pickup location
            # For others, use current location if available, otherwise pickup
            if order.status == OrderStatus.PENDING or not order.current_location:
                order_coords = (order.pickup_location.latitude, order.pickup_location.longitude)
            else:
                order_coords = (order.current_location.latitude, order.current_location.longitude)
            
            # Calculate distance to order
            target_coords = (latitude, longitude)
            distance = geodesic(order_coords, target_coords).km
            
            # Check if within radius
            if distance <= radius:
                # Format order and add distance
                order_data = self.format_order_tracking_response(order)
                order_data["distance"] = round(distance, 2)
                
                nearby_orders.append(order_data)
        
        # Sort by distance
        nearby_orders.sort(key=lambda x: x["distance"])
        
        # Apply limit
        return nearby_orders[:limit]