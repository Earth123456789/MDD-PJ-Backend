from tortoise import Tortoise
from config.settings import TORTOISE_ORM


async def init_db():
    """Initialize the database with Tortoise ORM."""
    await Tortoise.init(config=TORTOISE_ORM)
    # Generate schemas if needed
    await Tortoise.generate_schemas()


async def close_db():
    """Close database connections."""
    await Tortoise.close_connections()