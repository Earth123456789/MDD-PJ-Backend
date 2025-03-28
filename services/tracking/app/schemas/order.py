# app/schemas/order.py

from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field

from app.schemas.location import GeoPointCreate, GeoPointResponse


class OrderStatus(str, Enum):
    """Order status enum."""
    
    PENDING = "PENDING"
    MATCHING = "MATCHING"
    MATCHED = "MATCHED"
    IN_TRANSIT = "IN_TRANSIT"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"


class OrderTrackingCreate(BaseModel):
    """Schema for creating order tracking."""
    
    order_id: str
    user_id: str
    driver_id: Optional[str] = None
    vehicle_id: Optional[str] = None
    status: OrderStatus = OrderStatus.PENDING
    pickup_location: GeoPointCreate
    dropoff_location: GeoPointCreate
    current_location: Optional[GeoPointCreate] = None
    estimated_arrival_time: Optional[datetime] = None


class OrderTrackingResponse(BaseModel):
    """Schema for order tracking response."""
    
    order_id: str
    user_id: str
    driver_id: Optional[str] = None
    vehicle_id: Optional[str] = None
    status: str
    pickup_location: GeoPointResponse
    dropoff_location: GeoPointResponse
    current_location: Optional[GeoPointResponse] = None
    estimated_arrival_time: Optional[datetime] = None
    actual_arrival_time: Optional[datetime] = None
    distance_traveled: Optional[float] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class OrderStatusUpdateRequest(BaseModel):
    """Schema for order status update request."""
    
    order_id: str
    status: OrderStatus
    driver_id: Optional[str] = None
    vehicle_id: Optional[str] = None
    current_location: Optional[GeoPointCreate] = None
    estimated_arrival_time: Optional[datetime] = None


class OrderTrackingStatusResponse(BaseModel):
    """Schema for order tracking status response."""
    
    order_id: str
    status: str
    previous_status: Optional[str] = None
    current_location: Optional[GeoPointResponse] = None
    estimated_arrival_time: Optional[datetime] = None
    distance_traveled: Optional[float] = None
    updated_at: datetime
    
    class Config:
        from_attributes = True


class DeliveryProgressResponse(BaseModel):
    """Schema for delivery progress response."""
    
    order_id: int
    status: str
    driver_id: Optional[str] = None
    driver_name: Optional[str] = None
    vehicle_id: Optional[str] = None
    vehicle_type: Optional[str] = None
    current_location: Optional[GeoPointResponse] = None
    destination_location: GeoPointResponse
    estimated_arrival_time: Optional[datetime] = None
    distance_remaining: Optional[float] = None  # in kilometers
    time_remaining: Optional[int] = None  # in minutes
    progress_percentage: Optional[float] = None  # 0-100
    
    class Config:
        from_attributes = True


class OrderEventRequest(BaseModel):
    """Schema for order-related events."""
    
    event_type: str  # e.g. "order_created", "order_matched", "order_delivered"
    order_id: str
    user_id: str
    driver_id: Optional[str] = None
    vehicle_id: Optional[str] = None
    status: OrderStatus
    previous_status: Optional[OrderStatus] = None
    location: Optional[GeoPointCreate] = None
    metadata: Optional[Dict[str, Any]] = None