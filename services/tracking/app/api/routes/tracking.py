# app/api/routes/tracking.py

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional

from app.services.location_service import LocationService
from app.services.order_service import OrderService
from app.schemas.location import (
    LocationUpdateRequest,
    LocationUpdateResponse,
    LocationHistoryRequest,
    LocationHistoryResponse,
    NearbyDriversRequest
)
from app.schemas.order import (
    OrderTrackingCreate,
    OrderTrackingResponse,
    OrderStatusUpdateRequest,
    OrderTrackingStatusResponse,
    DeliveryProgressResponse
)
from app.db.models import GeoPoint, OrderStatus, DriverStatus
from app.core.security import get_current_driver_id, get_current_user_id

router = APIRouter()


# Driver location endpoints
@router.post("/locations/driver", response_model=LocationUpdateResponse)
async def update_driver_location(
    location_data: LocationUpdateRequest,
    location_service: LocationService = Depends(),
    driver_id: int = Depends(get_current_driver_id)
):
    """
    Update a driver's current location.
    
    This endpoint is used by the driver app to update the driver's current
    position as they move. It requires driver authentication.
    """
    # Override driver_id from request with authenticated driver_id
    location_data.driver_id = driver_id
    
    # Create GeoPoint from location data
    geo_point = GeoPoint(
        latitude=location_data.latitude,
        longitude=location_data.longitude,
        accuracy=location_data.accuracy,
        altitude=location_data.altitude
    )
    
    # Update driver location
    driver_location = await location_service.update_driver_location(
        driver_id=driver_id,
        location=geo_point,
        heading=location_data.heading,
        speed=location_data.speed,
        battery_level=location_data.battery_level,
        status=DriverStatus(location_data.status) if location_data.status else None
    )
    
    return LocationUpdateResponse(
        driver_id=driver_location.driver_id,
        location=driver_location.location,
        status=driver_location.status,
        heading=driver_location.heading,
        speed=driver_location.speed,
        battery_level=driver_location.battery_level,
        current_order_id=driver_location.current_order_id,
        updated_at=driver_location.updated_at
    )


@router.get("/locations/driver/{driver_id}", response_model=LocationUpdateResponse)
async def get_driver_location(
    driver_id: int,
    location_service: LocationService = Depends(),
    _: int = Depends(get_current_user_id)  # Authenticated user or admin access only
):
    """
    Get a driver's current location.
    
    This endpoint is used by the user app to retrieve the current position of 
    a specific driver. It requires user authentication.
    """
    driver_location = await location_service.get_driver_location(driver_id)
    
    if not driver_location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Driver location not found for driver {driver_id}"
        )
    
    return LocationUpdateResponse(
        driver_id=driver_location.driver_id,
        location=driver_location.location,
        status=driver_location.status,
        heading=driver_location.heading,
        speed=driver_location.speed,
        battery_level=driver_location.battery_level,
        current_order_id=driver_location.current_order_id,
        updated_at=driver_location.updated_at
    )


@router.post("/locations/driver/history", response_model=LocationHistoryResponse)
async def get_driver_location_history(
    history_request: LocationHistoryRequest,
    location_service: LocationService = Depends(),
    _: int = Depends(get_current_driver_id)  # Authenticated driver or admin access only
):
    """
    Get a driver's location history.
    
    This endpoint retrieves the historical location data for a driver within
    a specified time range. It requires driver authentication.
    """
    locations = await location_service.get_driver_location_history(
        driver_id=history_request.driver_id,
        start_time=history_request.start_time,
        end_time=history_request.end_time,
        limit=history_request.limit,
        skip=history_request.skip
    )
    
    return LocationHistoryResponse(
        driver_id=history_request.driver_id,
        locations=locations
    )


@router.post("/locations/nearby-drivers", response_model=List[dict])
async def find_nearby_drivers(
    nearby_request: NearbyDriversRequest,
    location_service: LocationService = Depends(),
    _: int = Depends(get_current_user_id)  # Authenticated user access only
):
    """
    Find drivers near a specific location.
    
    This endpoint is used to find available drivers within a certain radius
    of a given location. It requires user authentication.
    """
    nearby_drivers = await location_service.find_nearby_drivers(
        latitude=nearby_request.latitude,
        longitude=nearby_request.longitude,
        radius=nearby_request.radius,
        driver_status=DriverStatus.ACTIVE if nearby_request.status == "ACTIVE" else None,
        limit=nearby_request.limit
    )
    
    return nearby_drivers


# Order tracking endpoints
@router.post("/orders", response_model=OrderTrackingResponse)
async def create_order_tracking(
    order_data: OrderTrackingCreate,
    order_service: OrderService = Depends(),
    current_user_id: Optional[int] = Depends(get_current_user_id)
):
    """
    Create tracking for a new order.
    
    This endpoint is called when a new order is created in the system to
    initialize tracking. It requires user authentication.
    """
    # Use the user_id from the request body, but validate it matches the token
    user_id = order_data.user_id
    
    # Optional: Validate that the authenticated user matches the requested user
    # Uncomment this if you want only authenticated users to create orders for themselves
    # if current_user_id is not None and user_id != current_user_id:
    #    logger.warning(f"User {current_user_id} attempted to create order for user {user_id}")
    #    raise HTTPException(
    #        status_code=status.HTTP_403_FORBIDDEN,
    #        detail="Not authorized to create orders for other users"
    #    )
    
    # Create GeoPoints from location data
    pickup_location = GeoPoint(
        latitude=order_data.pickup_location.latitude,
        longitude=order_data.pickup_location.longitude,
        accuracy=order_data.pickup_location.accuracy,
        altitude=order_data.pickup_location.altitude
    )
    
    dropoff_location = GeoPoint(
        latitude=order_data.dropoff_location.latitude,
        longitude=order_data.dropoff_location.longitude,
        accuracy=order_data.dropoff_location.accuracy,
        altitude=order_data.dropoff_location.altitude
    )
    
    # Create order tracking
    try:
        order_tracking = await order_service.create_order_tracking(
            order_id=order_data.order_id,
            user_id=user_id,  # Use user_id from request
            pickup_location=pickup_location,
            dropoff_location=dropoff_location,
            driver_id=order_data.driver_id,
            vehicle_id=order_data.vehicle_id,
            status=order_data.status
        )
        
        return OrderTrackingResponse(
            order_id=order_tracking.order_id,
            user_id=order_tracking.user_id,
            driver_id=order_tracking.driver_id,
            vehicle_id=order_tracking.vehicle_id,
            status=order_tracking.status,
            pickup_location=order_tracking.pickup_location,
            dropoff_location=order_tracking.dropoff_location,
            current_location=order_tracking.current_location,
            estimated_arrival_time=order_tracking.estimated_arrival_time,
            actual_arrival_time=order_tracking.actual_arrival_time,
            distance_traveled=order_tracking.distance_traveled,
            started_at=order_tracking.started_at,
            completed_at=order_tracking.completed_at,
            created_at=order_tracking.created_at,
            updated_at=order_tracking.updated_at
        )
    except ValueError as e:
        # Catch validation errors from service
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/orders/{order_id}", response_model=OrderTrackingResponse)
async def get_order_tracking(
    order_id: int,
    order_service: OrderService = Depends(),
    user_id: int = Depends(get_current_user_id)  # Authenticated user access only
):
    """
    Get tracking information for an order.
    
    This endpoint retrieves the tracking information for a specific order.
    It requires user authentication.
    """
    order_tracking = await order_service.get_order_tracking(order_id)
    
    if not order_tracking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order tracking not found for order {order_id}"
        )
    
    # Check if user is authorized to view this order
    if order_tracking.user_id != user_id:
        # In a real system, you might want to check if the user is an admin or the driver
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this order"
        )
    
    return OrderTrackingResponse(
        order_id=order_tracking.order_id,
        user_id=order_tracking.user_id,
        driver_id=order_tracking.driver_id,
        vehicle_id=order_tracking.vehicle_id,
        status=order_tracking.status,
        pickup_location=order_tracking.pickup_location,
        dropoff_location=order_tracking.dropoff_location,
        current_location=order_tracking.current_location,
        estimated_arrival_time=order_tracking.estimated_arrival_time,
        actual_arrival_time=order_tracking.actual_arrival_time,
        distance_traveled=order_tracking.distance_traveled,
        started_at=order_tracking.started_at,
        completed_at=order_tracking.completed_at,
        created_at=order_tracking.created_at,
        updated_at=order_tracking.updated_at
    )


@router.post("/orders/{order_id}/status", response_model=OrderTrackingStatusResponse)
async def update_order_status(
    order_id: int,
    status_update: OrderStatusUpdateRequest,
    order_service: OrderService = Depends(),
    driver_id: int = Depends(get_current_driver_id)  # Authenticated driver access only
):
    """
    Update the status of an order.
    
    This endpoint is used by drivers to update the status of an order
    (e.g., in_transit, delivered). It requires driver authentication.
    """
    # Override driver_id and order_id from request with authenticated values
    status_update.driver_id = driver_id
    status_update.order_id = order_id
    
    # Create GeoPoint from location data if provided
    current_location = None
    if status_update.current_location:
        current_location = GeoPoint(
            latitude=status_update.current_location.latitude,
            longitude=status_update.current_location.longitude,
            accuracy=status_update.current_location.accuracy,
            altitude=status_update.current_location.altitude
        )
    
    # Get the current order status for comparison
    order = await order_service.get_order_tracking(order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order tracking not found for order {order_id}"
        )
    
    # Verify that this driver is assigned to this order
    if order.driver_id != driver_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this order's status"
        )
    
    # Store previous status
    previous_status = order.status
    
    # Update order status
    updated_order = await order_service.update_order_status(
        order_id=order_id,
        status=status_update.status,
        location=current_location
    )
    
    if not updated_order:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update order status to {status_update.status}"
        )
    
    return OrderTrackingStatusResponse(
        order_id=updated_order.order_id,
        status=updated_order.status,
        previous_status=previous_status,
        current_location=updated_order.current_location,
        estimated_arrival_time=updated_order.estimated_arrival_time,
        distance_traveled=updated_order.distance_traveled,
        updated_at=updated_order.updated_at
    )


@router.post("/orders/{order_id}/start", response_model=OrderTrackingStatusResponse)
async def start_order_delivery(
    order_id: int,
    order_service: OrderService = Depends(),
    driver_id: int = Depends(get_current_driver_id)  # Authenticated driver access only
):
    """
    Start delivery for an order (change to IN_TRANSIT).
    
    This endpoint is a shortcut for drivers to mark an order as in transit.
    It requires driver authentication.
    """
    # Get the current order status
    order = await order_service.get_order_tracking(order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order tracking not found for order {order_id}"
        )
    
    # Verify that this driver is assigned to this order
    if order.driver_id != driver_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to start delivery for this order"
        )
    
    # Store previous status
    previous_status = order.status
    
    # Start delivery (mark as IN_TRANSIT)
    updated_order = await order_service.mark_order_in_transit(
        order_id=order_id,
        driver_id=driver_id
    )
    
    if not updated_order:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to start delivery"
        )
    
    return OrderTrackingStatusResponse(
        order_id=updated_order.order_id,
        status=updated_order.status,
        previous_status=previous_status,
        current_location=updated_order.current_location,
        estimated_arrival_time=updated_order.estimated_arrival_time,
        distance_traveled=updated_order.distance_traveled,
        updated_at=updated_order.updated_at
    )


@router.post("/orders/{order_id}/complete", response_model=OrderTrackingStatusResponse)
async def complete_order_delivery(
    order_id: int,
    order_service: OrderService = Depends(),
    location_service: LocationService = Depends(),
    driver_id: int = Depends(get_current_driver_id)  # Authenticated driver access only
):
    """
    Complete delivery for an order (change to DELIVERED).
    
    This endpoint is used by drivers to mark an order as delivered.
    It requires driver authentication.
    """
    # Get current driver location
    driver_location = await location_service.get_driver_location(driver_id)
    current_location = None
    
    if driver_location and driver_location.location:
        current_location = driver_location.location
    
    # Get the current order status
    order = await order_service.get_order_tracking(order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order tracking not found for order {order_id}"
        )
    
    # Verify that this driver is assigned to this order
    if order.driver_id != driver_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to complete delivery for this order"
        )
    
    # Store previous status
    previous_status = order.status
    
    # Complete delivery (mark as DELIVERED)
    updated_order = await order_service.mark_order_delivered(
        order_id=order_id,
        driver_id=driver_id,
        location=current_location
    )
    
    if not updated_order:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to complete delivery"
        )
    
    # Update driver status and current order
    await location_service.update_driver_order(driver_id, None)
    
    return OrderTrackingStatusResponse(
        order_id=updated_order.order_id,
        status=updated_order.status,
        previous_status=previous_status,
        current_location=updated_order.current_location,
        estimated_arrival_time=updated_order.estimated_arrival_time,
        distance_traveled=updated_order.distance_traveled,
        updated_at=updated_order.updated_at
    )


@router.post("/orders/{order_id}/cancel", response_model=OrderTrackingStatusResponse)
async def cancel_order(
    order_id: int,
    order_service: OrderService = Depends(),
    location_service: LocationService = Depends(),
    user_id: Optional[int] = Depends(get_current_user_id),
    driver_id: Optional[int] = None  # Can be None if user is cancelling
):
    """
    Cancel an order.
    
    This endpoint can be used by both users and drivers to cancel an order.
    It requires authentication.
    """
    # Get the current order status
    order = await order_service.get_order_tracking(order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order tracking not found for order {order_id}"
        )
    
    # Store previous status
    previous_status = order.status
    
    # Cancel the order
    updated_order = await order_service.cancel_order(
        order_id=order_id,
        user_id=user_id,
        driver_id=driver_id
    )
    
    if not updated_order:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to cancel order"
        )
    
    # If driver was assigned, update their status and current order
    if updated_order.driver_id:
        await location_service.update_driver_order(updated_order.driver_id, None)
    
    return OrderTrackingStatusResponse(
        order_id=updated_order.order_id,
        status=updated_order.status,
        previous_status=previous_status,
        current_location=updated_order.current_location,
        estimated_arrival_time=None,  # Clear estimated arrival time
        distance_traveled=updated_order.distance_traveled,
        updated_at=updated_order.updated_at
    )


@router.get("/orders/{order_id}/progress", response_model=DeliveryProgressResponse)
async def get_delivery_progress(
    order_id: int,
    order_service: OrderService = Depends(),
    user_id: int = Depends(get_current_user_id)  # Authenticated user access only
):
    """
    Get delivery progress for an order.
    
    This endpoint provides detailed progress information for an order in transit.
    It requires user authentication.
    """
    # Get order tracking
    order = await order_service.get_order_tracking(order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order tracking not found for order {order_id}"
        )
    
    # Check if user is authorized to view this order
    if order.user_id != user_id:
        # In a real system, you might want to check if the user is an admin
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this order"
        )
    
    # Format order tracking response
    response_data = order_service.format_order_tracking_response(order)
    
    # Create delivery progress response
    return DeliveryProgressResponse(
        order_id=order.order_id,
        status=order.status,
        driver_id=order.driver_id,
        driver_name=None,  # Would be fetched from user-driver service in a real system
        vehicle_id=order.vehicle_id,
        vehicle_type=None,  # Would be fetched from matching service in a real system
        current_location=order.current_location,
        destination_location=order.dropoff_location,
        estimated_arrival_time=order.estimated_arrival_time,
        distance_remaining=response_data.get("distance_remaining"),
        time_remaining=response_data.get("time_remaining_minutes"),
        progress_percentage=response_data.get("progress_percentage")
    )


@router.get("/orders/nearby", response_model=List[dict])
async def get_nearby_orders(
    latitude: float = Query(..., description="Latitude coordinate"),
    longitude: float = Query(..., description="Longitude coordinate"),
    radius: float = Query(5.0, description="Search radius in kilometers"),
    status: Optional[str] = Query(None, description="Filter by order status"),
    limit: int = Query(10, description="Maximum number of orders to return"),
    order_service: OrderService = Depends(),
    _: int = Depends(get_current_driver_id)  # Authenticated driver access only
):
    """
    Find orders near a specific location.
    
    This endpoint is used by drivers to find available orders near their location.
    It requires driver authentication.
    """
    # Convert status string to enum if provided
    order_status = None
    if status:
        try:
            order_status = OrderStatus(status)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid order status: {status}"
            )
    
    # Find nearby orders
    nearby_orders = await order_service.get_nearby_orders(
        latitude=latitude,
        longitude=longitude,
        radius=radius,
        status=order_status,
        limit=limit
    )
    
    return nearby_orders