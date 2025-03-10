import asyncio
import os
from faker import Faker
from tortoise import Tortoise
from models.models import Order, OrderItem, PriceCalculation, OrderStatusHistory  # Assuming models are defined here

fake = Faker()

DEBUG = os.getenv("DEBUG", "False").lower() == "true"

# Database settings
DB_ENGINE = os.getenv("DB_ENGINE", "postgres")
DB_NAME = os.getenv("DB_NAME", "order_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "Vipat")
DB_PORT = os.getenv("DB_PORT", "5432")  # Ensure this is set

# In Docker
# DB_HOST = os.getenv("DB_HOST_DOCKER", "postgres")

# In dev Mode
DB_HOST = os.getenv("DB_HOST", "localhost")

# Database connection URL
DATABASE_URL = f"{DB_ENGINE}://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Tortoise ORM Models Configuration
TORTOISE_ORM = {
    "connections": {"default": DATABASE_URL},
    "apps": {
        "models": {
            "models": ["models.models", "aerich.models"],  # Make sure 'models.models' is the correct path
            "default_connection": "default",
        },
    },
}

async def init():
    """Initialize Tortoise ORM with configuration from TORTOISE_ORM."""
    await Tortoise.init(config=TORTOISE_ORM)  # Using the configuration dictionary
    await Tortoise.generate_schemas()

async def create_mock_data():
    """Generate mock data for orders and related tables."""
    await init()

    # Create Orders
    orders = []
    for _ in range(5):  # Generate 5 orders
        order = await Order.create(
            customer_id=fake.random_int(min=100, max=999),
            pickup_location=fake.city(),
            delivery_location=fake.city(),
            requested_pickup_date=fake.date_this_year(),
            delivery_deadline=fake.date_this_year(),
            total_price=fake.pydecimal(left_digits=4, right_digits=2, positive=True),
            status="pending"
        )
        orders.append(order)

    # Create Order Items
    for order in orders:
        for _ in range(fake.random_int(min=1, max=3)):  # Each order has 1-3 items
            await OrderItem.create(
                order=order,
                cargo_type=fake.word(),
                weight_kg=fake.pydecimal(left_digits=2, right_digits=2, positive=True),
                dimensions_cm=f"{fake.random_int(10, 100)}x{fake.random_int(10, 100)}x{fake.random_int(10, 100)}",
                special_requirements=fake.sentence(nb_words=5),
                item_price=fake.pydecimal(left_digits=3, right_digits=2, positive=True),
                status="pending"
            )

    # Create Price Calculations
    for order in orders:
        await PriceCalculation.create(
            order=order,
            base_price=fake.pydecimal(left_digits=3, right_digits=2, positive=True),
            distance_factor=fake.pydecimal(left_digits=1, right_digits=2, positive=True),
            weight_factor=fake.pydecimal(left_digits=1, right_digits=2, positive=True),
            urgency_factor=fake.pydecimal(left_digits=1, right_digits=2, positive=True),
            final_price=fake.pydecimal(left_digits=4, right_digits=2, positive=True)
        )

    # Create Order Status History
    for order in orders:
        await OrderStatusHistory.create(
            order=order,
            status="pending",
            changed_by=fake.random_int(min=1, max=100),
            notes=fake.sentence(nb_words=10)
        )

    print("Mock data inserted successfully.")
    await Tortoise.close_connections()

if __name__ == "__main__":
    asyncio.run(create_mock_data())
