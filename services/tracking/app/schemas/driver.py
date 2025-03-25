# app/schemas/driver.py

from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime


class DriverCreate(BaseModel):
    """
    Schema for creating a new driver.
    """
    first_name: str
    last_name: str
    email: str
    phone_number: str
    license_number: str
    vehicle_id: Optional[int] = None


class DriverResponse(BaseModel):
    """
    Schema for returning driver information.
    """
    driver_id: int
    first_name: str
    last_name: str
    email: str
    phone_number: str
    status: str = "INACTIVE"
    vehicle_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class DriverStatusUpdate(BaseModel):
    """
    Schema for updating driver status.
    """
    status: str = Field(..., description="New driver status")
    reason: Optional[str] = Field(None, description="Reason for status change")


class DriverVehicleAssignment(BaseModel):
    """
    Schema for assigning a vehicle to a driver.
    """
    driver_id: int
    vehicle_id: int
    assigned_at: Optional[datetime] = Field(default_factory=datetime.utcnow)