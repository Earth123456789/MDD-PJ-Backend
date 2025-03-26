# app/db/mongodb_atlas.py

import logging
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from typing import List, Type, Optional
from beanie import Document

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class MongoDBAtlasClient:
    """
    MongoDB Atlas client for connecting to MongoDB Atlas.
    """
    
    def __init__(self, connection_string: Optional[str] = None, db_name: Optional[str] = None):
        """
        Initialize MongoDB Atlas client.
        
        Args:
            connection_string: MongoDB Atlas connection string
            db_name: MongoDB database name
        """
        self.connection_string = connection_string or settings.MONGODB_URI
        self.db_name = db_name or settings.MONGODB_DB
        self.client = None
        self.db = None
        self.is_connected = False
        self.retry_count = 0
        self.max_retries = 3
    
    async def connect(self, document_models: List[Type[Document]]):
        """
        Connect to MongoDB Atlas with retry mechanism.
        
        Args:
            document_models: List of document models to initialize
            
        Returns:
            True if connected successfully, False otherwise
        """
        while self.retry_count < self.max_retries:
            try:
                logger.info(f"Connecting to MongoDB Atlas: {self.db_name} (Attempt {self.retry_count + 1}/{self.max_retries})")
                
                # Create MongoDB client with a timeout
                self.client = AsyncIOMotorClient(
                    self.connection_string,
                    serverSelectionTimeoutMS=5000,  # 5 second timeout
                    connectTimeoutMS=5000,
                    socketTimeoutMS=5000
                )
                
                # Test the connection
                await self.client.admin.command('ping')
                
                # Initialize Beanie with the client
                await init_beanie(
                    database=self.client[self.db_name],
                    document_models=document_models
                )
                
                # Set instance variables
                self.db = self.client[self.db_name]
                self.is_connected = True
                
                logger.info("Connected to MongoDB Atlas successfully")
                self.retry_count = 0  # Reset retry counter on success
                return True
            
            except Exception as e:
                self.retry_count += 1
                logger.error(f"Error connecting to MongoDB Atlas (Attempt {self.retry_count}/{self.max_retries}): {e}")
                
                if self.retry_count < self.max_retries:
                    # Wait before retrying (exponential backoff)
                    wait_time = 2 ** self.retry_count
                    logger.info(f"Retrying in {wait_time} seconds...")
                    await asyncio.sleep(wait_time)
                else:
                    logger.warning("Maximum MongoDB Atlas connection attempts reached")
                    return False
    
    async def close(self):
        """
        Close MongoDB Atlas connection.
        """
        if self.client:
            self.client.close()
            self.is_connected = False
            logger.info("Closed MongoDB Atlas connection")
    
    async def ping(self) -> bool:
        """
        Ping MongoDB Atlas to check connection.
        
        Returns:
            True if ping successful, False otherwise
        """
        try:
            if not self.client:
                return False
            
            # Run a simple command to check connection
            await self.client.admin.command('ping')
            return True
        
        except Exception as e:
            logger.error(f"Error pinging MongoDB Atlas: {e}")
            return False


async def init_mongodb_atlas(document_models: List[Type[Document]]) -> MongoDBAtlasClient:
    """
    Initialize MongoDB Atlas connection.
    
    Args:
        document_models: List of document models to initialize
        
    Returns:
        MongoDB Atlas client
    """
    client = MongoDBAtlasClient()
    success = await client.connect(document_models)
    if not success:
        logger.warning("Failed to connect to MongoDB Atlas, some functionality may be limited")
    return client