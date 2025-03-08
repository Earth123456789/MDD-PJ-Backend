from typing import List
from fastapi import HTTPException
from models.models import (
    Order,
    PriceCalculation,
    PriceCalculation_Pydantic,
    PriceCalculationIn_Pydantic
)
from utils.rabbit_utils import rabbit_client


async def get_price_calculations(order_id: int) -> List[PriceCalculation_Pydantic]:
    """Get all price calculations for a specific order."""
    # Check if order exists
    order = await Order.filter(order_id=order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail=f"Order with ID {order_id} not found")
    
    calculations = await PriceCalculation.filter(order_id=order_id)
    return await PriceCalculation_Pydantic.from_queryset(PriceCalculation.filter(order_id=order_id))


async def get_price_calculation(order_id: int, calculation_id: int) -> PriceCalculation_Pydantic:
    """Get a specific price calculation for an order."""
    calculation = await PriceCalculation.filter(order_id=order_id, calculation_id=calculation_id).first()
    if not calculation:
        raise HTTPException(
            status_code=404, 
            detail=f"Price calculation with ID {calculation_id} not found for order {order_id}"
        )
    return await PriceCalculation_Pydantic.from_tortoise_orm(calculation)


async def create_price_calculation(order_id: int, calculation_data: PriceCalculationIn_Pydantic) -> PriceCalculation_Pydantic:
    """Create a new price calculation for an order."""
    # Check if order exists
    order = await Order.filter(order_id=order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail=f"Order with ID {order_id} not found")
    
    # Create calculation dict and set the order_id
    calculation_dict = calculation_data.dict()
    calculation_dict["order_id"] = order_id
    
    # Ensure the final price is calculated
    if "final_price" not in calculation_dict:
        base_price = float(calculation_dict["base_price"])
        distance_factor = float(calculation_dict["distance_factor"])
        weight_factor = float(calculation_dict["weight_factor"])
        urgency_factor = float(calculation_dict["urgency_factor"])
        
        final_price = base_price * (1 + distance_factor + weight_factor + urgency_factor)
        calculation_dict["final_price"] = round(final_price, 2)
    
    # Create the calculation
    calculation = await PriceCalculation.create(**calculation_dict)
    
    # Update order total price with latest calculation
    await order.update_from_dict({"total_price": calculation_dict["final_price"]})
    await order.save()
    
    # Publish to RabbitMQ
    calculation_obj = await PriceCalculation_Pydantic.from_tortoise_orm(calculation)
    rabbit_client.publish_message(
        message=calculation_obj.dict(),
        message_type="price_calculation.created"
    )
    
    return await PriceCalculation_Pydantic.from_tortoise_orm(calculation)


async def update_price_calculation(
    order_id: int, 
    calculation_id: int, 
    calculation_data: PriceCalculationIn_Pydantic
) -> PriceCalculation_Pydantic:
    """Update an existing price calculation."""
    # Check if calculation exists
    calculation = await PriceCalculation.filter(order_id=order_id, calculation_id=calculation_id).first()
    if not calculation:
        raise HTTPException(
            status_code=404, 
            detail=f"Price calculation with ID {calculation_id} not found for order {order_id}"
        )
    
    # Update the calculation
    calculation_dict = calculation_data.dict(exclude_unset=True)
    
    # If any price factors are updated, recalculate final price
    recalculate_price = False
    price_factors = ["base_price", "distance_factor", "weight_factor", "urgency_factor"]
    
    if any(factor in calculation_dict for factor in price_factors):
        recalculate_price = True
    
    if recalculate_price:
        # Get the current values for any factors not in the update
        base_price = calculation_dict.get("base_price", calculation.base_price)
        distance_factor = calculation_dict.get("distance_factor", calculation.distance_factor)
        weight_factor = calculation_dict.get("weight_factor", calculation.weight_factor)
        urgency_factor = calculation_dict.get("urgency_factor", calculation.urgency_factor)
        
        # Recalculate final price
        final_price = float(base_price) * (1 + float(distance_factor) + float(weight_factor) + float(urgency_factor))
        calculation_dict["final_price"] = round(final_price, 2)
    
    await calculation.update_from_dict(calculation_dict)
    await calculation.save()
    
    # Update order total price if the final price changed
    if "final_price" in calculation_dict:
        order = await Order.filter(order_id=order_id).first()
        await order.update_from_dict({"total_price": calculation_dict["final_price"]})
        await order.save()
    
    # Publish to RabbitMQ
    calculation_obj = await PriceCalculation_Pydantic.from_tortoise_orm(calculation)
    rabbit_client.publish_message(
        message=calculation_obj.dict(),
        message_type="price_calculation.updated"
    )
    
    return await PriceCalculation_Pydantic.from_tortoise_orm(calculation)


async def delete_price_calculation(order_id: int, calculation_id: int) -> bool:
    """Delete a price calculation."""
    # Check if calculation exists
    calculation = await PriceCalculation.filter(order_id=order_id, calculation_id=calculation_id).first()
    if not calculation:
        raise HTTPException(
            status_code=404, 
            detail=f"Price calculation with ID {calculation_id} not found for order {order_id}"
        )
    
    # Get calculation data before deletion for the message
    calculation_obj = await PriceCalculation_Pydantic.from_tortoise_orm(calculation)
    
    # Delete the calculation
    await calculation.delete()
    
    # Publish to RabbitMQ
    rabbit_client.publish_message(
        message={
            "calculation_id": calculation_id, 
            "order_id": order_id, 
            "details": calculation_obj.dict()
        },
        message_type="price_calculation.deleted"
    )
    
    return True