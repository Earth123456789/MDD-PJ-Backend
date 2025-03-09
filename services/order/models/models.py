from tortoise import fields, models
from tortoise.contrib.pydantic import pydantic_model_creator
from enum import Enum
from datetime import date


class OrderStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    PICKUP_READY = "pickup_ready"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    RETURNED = "returned"


class ItemStatus(str, Enum):
    PENDING = "pending"
    PACKED = "packed"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    RETURNED = "returned"


class Order(models.Model):
    order_id = fields.IntField(pk=True)
    customer_id = fields.IntField()
    pickup_location = fields.CharField(max_length=255)
    delivery_location = fields.CharField(max_length=255)
    requested_pickup_date = fields.DateField()
    delivery_deadline = fields.DateField()
    total_price = fields.DecimalField(max_digits=10, decimal_places=2)
    status = fields.CharEnumField(OrderStatus, max_length=20, default=OrderStatus.PENDING)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "orders"


class OrderItem(models.Model):
    item_id = fields.IntField(pk=True)
    order = fields.ForeignKeyField("models.Order", related_name="order_items", on_delete=fields.CASCADE)
    cargo_type = fields.CharField(max_length=50)
    weight_kg = fields.DecimalField(max_digits=8, decimal_places=2)
    dimensions_cm = fields.CharField(max_length=50)
    special_requirements = fields.CharField(max_length=255, null=True)
    item_price = fields.DecimalField(max_digits=10, decimal_places=2)
    status = fields.CharEnumField(ItemStatus, max_length=20, default=ItemStatus.PENDING)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "order_items"


class PriceCalculation(models.Model):
    calculation_id = fields.IntField(pk=True)
    order = fields.ForeignKeyField("models.Order", related_name="price_calculations", on_delete=fields.CASCADE)
    base_price = fields.DecimalField(max_digits=10, decimal_places=2)
    distance_factor = fields.DecimalField(max_digits=5, decimal_places=2)
    weight_factor = fields.DecimalField(max_digits=5, decimal_places=2)
    urgency_factor = fields.DecimalField(max_digits=5, decimal_places=2)
    final_price = fields.DecimalField(max_digits=10, decimal_places=2)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "price_calculations"


class OrderStatusHistory(models.Model):
    history_id = fields.IntField(pk=True)
    order = fields.ForeignKeyField("models.Order", related_name="order_status_history", on_delete=fields.CASCADE)
    status = fields.CharEnumField(OrderStatus, max_length=20)
    changed_at = fields.DatetimeField(auto_now_add=True)
    changed_by = fields.IntField()
    notes = fields.CharField(max_length=255, null=True)

    class Meta:
        table = "order_status_history"


# Pydantic models for request & response
Order_Pydantic = pydantic_model_creator(Order, name="Order")
OrderIn_Pydantic = pydantic_model_creator(
    Order, 
    name="OrderIn", 
    exclude_readonly=True,
    exclude=("order_id", "created_at", "updated_at")
)

OrderItem_Pydantic = pydantic_model_creator(OrderItem, name="OrderItem")
OrderItemIn_Pydantic = pydantic_model_creator(
    OrderItem, 
    name="OrderItemIn", 
    exclude_readonly=True,
    exclude=("item_id", "created_at", "updated_at")
)

PriceCalculation_Pydantic = pydantic_model_creator(PriceCalculation, name="PriceCalculation")
PriceCalculationIn_Pydantic = pydantic_model_creator(
    PriceCalculation, 
    name="PriceCalculationIn", 
    exclude_readonly=True,
    exclude=("calculation_id", "created_at", "updated_at")
)

OrderStatusHistory_Pydantic = pydantic_model_creator(OrderStatusHistory, name="OrderStatusHistory")
OrderStatusHistoryIn_Pydantic = pydantic_model_creator(
    OrderStatusHistory, 
    name="OrderStatusHistoryIn", 
    exclude_readonly=True,
    exclude=("history_id", "changed_at")
)