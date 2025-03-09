from fastapi import APIRouter
from .order import router as order_router
from .order_item import router as order_item_router
from .price_calculation import router as price_calculation_router
from .status_history import router as status_history_router

api_router = APIRouter()

api_router.include_router(order_router)
api_router.include_router(order_item_router)
api_router.include_router(price_calculation_router)
api_router.include_router(status_history_router)