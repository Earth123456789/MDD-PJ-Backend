# app/schemas/location.py

from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field


class GeoPointCreate(BaseModel):
    """Schema for creating a geographic coordinates."""
    
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    altitude: Optional[float] = None
    timestamp: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None


class GeoPointResponse(GeoPointCreate):
    """Schema for returning geographic coordinates."""
    
    timestamp: datetime
    
    class Config:
        from_attributes = True


class LocationUpdateRequest(BaseModel):
    """Schema for driver location update request."""
    
    driver_id: int
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    altitude: Optional[float] = None
    heading: Optional[float] = None  # in degrees (0-360)
    speed: Optional[float] = None  # in km/h
    battery_level: Optional[float] = None  # in percentage (0-100)
    status: Optional[str] = None  # Driver status
    order_id: Optional[int] = None  # Current order ID if applicable
    metadata: Optional[Dict[str, Any]] = None


class LocationUpdateResponse(BaseModel):
    """Schema for driver location update response."""
    
    driver_id: int
    location: GeoPointResponse
    status: str
    heading: Optional[float] = None
    speed: Optional[float] = None
    battery_level: Optional[float] = None
    current_order_id: Optional[int] = None
    updated_at: datetime
    
    class Config:
        from_attributes = True


class LocationHistoryRequest(BaseModel):
    """Schema for requesting driver location history."""
    
    driver_id: int
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    limit: Optional[int] = 100
    skip: Optional[int] = 0


class LocationHistoryResponse(BaseModel):
    """Schema for driver location history response."""
    
    driver_id: int
    locations: List[GeoPointResponse]
    
    class Config:
        from_attributes = True


class NearbyDriversRequest(BaseModel):
    """Schema for requesting nearby drivers."""
    
    latitude: float
    longitude: float
    radius: Optional[float] = 5.0  # in kilometers
    limit: Optional[int] = 10
    status: Optional[str] = None  # Filter by driver status