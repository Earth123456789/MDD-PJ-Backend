from typing import List
from fastapi import APIRouter, HTTPException
from models.models import PriceCalculationIn_Pydantic, PriceCalculation_Pydantic
from controllers.price_calculation_controller import (
    get_price_calculations,
    get_price_calculation,
    create_price_calculation,
    update_price_calculation,
    delete_price_calculation
)

router = APIRouter(
    prefix="/order/{order_id}/price",
    tags=["price calculations"],
    responses={404: {"description": "Not found"}},
)


@router.get("/", response_model=List[PriceCalculation_Pydantic])
async def read_price_calculations(order_id: int):
    """
    Get all price calculations for a specific order.
    """
    return await get_price_calculations(order_id)


@router.get("/{calculation_id}", response_model=PriceCalculation_Pydantic)
async def read_price_calculation(order_id: int, calculation_id: int):
    """
    Get a specific price calculation for an order.
    """
    return await get_price_calculation(order_id, calculation_id)


@router.post("/", response_model=PriceCalculation_Pydantic, status_code=201)
async def create_new_price_calculation(order_id: int, calculation: PriceCalculationIn_Pydantic):
    """
    Create a new price calculation for an order.
    """
    return await create_price_calculation(order_id, calculation)


@router.put("/{calculation_id}", response_model=PriceCalculation_Pydantic)
async def update_existing_calculation(
    order_id: int, 
    calculation_id: int, 
    calculation: PriceCalculationIn_Pydantic
):
    """
    Update an existing price calculation.
    """
    return await update_price_calculation(order_id, calculation_id, calculation)


@router.delete("/{calculation_id}")
async def delete_existing_calculation(order_id: int, calculation_id: int):
    """
    Delete a price calculation.
    """
    success = await delete_price_calculation(order_id, calculation_id)
    if success:
        return {"message": f"Price calculation {calculation_id} deleted successfully from order {order_id}"}
    return {"message": f"Failed to delete price calculation {calculation_id} from order {order_id}"}