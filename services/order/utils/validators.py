from datetime import date, datetime
from typing import Optional
from fastapi import HTTPException


def validate_date_format(date_str: str) -> date:
    """
    Validate that the date string is in the correct format (YYYY-MM-DD).
    """
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid date format: {date_str}. Expected format: YYYY-MM-DD"
        )


def validate_future_date(date_val: date, field_name: str) -> None:
    """
    Validate that the date is in the future.
    """
    if date_val < date.today():
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} must be a future date"
        )


def validate_dimensions_format(dimensions: str) -> None:
    """
    Validate that the dimensions are in the correct format (LxWxH).
    """
    try:
        parts = dimensions.split("x")
        if len(parts) != 3:
            raise ValueError()
        
        for part in parts:
            float(part)
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid dimensions format: {dimensions}. Expected format: LxWxH (e.g., 10.5x20x30)"
        )


def validate_price(price: float, min_price: float = 0.0) -> None:
    """
    Validate that the price is not negative.
    """
    if price < min_price:
        raise HTTPException(
            status_code=400,
            detail=f"Price must be at least {min_price}"
        )


def validate_weight(weight: float, min_weight: float = 0.1) -> None:
    """
    Validate that the weight is positive.
    """
    if weight < min_weight:
        raise HTTPException(
            status_code=400,
            detail=f"Weight must be at least {min_weight} kg"
        )


def validate_delivery_deadline(pickup_date: date, delivery_deadline: date) -> None:
    """
    Validate that the delivery deadline is after the pickup date.
    """
    if delivery_deadline <= pickup_date:
        raise HTTPException(
            status_code=400,
            detail="Delivery deadline must be after pickup date"
        )