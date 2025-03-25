# app/db/repositories.py

from typing import Optional, List, Dict, Any
from beanie import Document
from motor.motor_asyncio import AsyncIOMotorClient

from app.config import get_settings

settings = get_settings()


class BaseRepository:
    """
    Base repository for database operations.
    
    Provides common CRUD operations for database models.
    """
    
    def __init__(self, model_class: Document):
        """
        Initialize repository with a specific model class.
        
        Args:
            model_class: The Beanie document model class
        """
        self.model = model_class
    
    async def create(self, data: Dict[str, Any]) -> Document:
        """
        Create a new document.
        
        Args:
            data: Dictionary of document attributes
            
        Returns:
            The created document
        """
        document = self.model(**data)
        return await document.save()
    
    async def find_by_id(self, document_id: str) -> Optional[Document]:
        """
        Find a document by its ID.
        
        Args:
            document_id: The document's unique identifier
            
        Returns:
            The found document or None
        """
        return await self.model.get(document_id)
    
    async def find_one(self, query: Dict[str, Any]) -> Optional[Document]:
        """
        Find a single document matching the query.
        
        Args:
            query: Dictionary of query conditions
            
        Returns:
            The first matching document or None
        """
        return await self.model.find_one(query)
    
    async def find_many(
        self, 
        query: Dict[str, Any], 
        skip: int = 0, 
        limit: int = 100
    ) -> List[Document]:
        """
        Find multiple documents matching the query.
        
        Args:
            query: Dictionary of query conditions
            skip: Number of documents to skip
            limit: Maximum number of documents to return
            
        Returns:
            List of matching documents
        """
        return await self.model.find(query).skip(skip).limit(limit).to_list()
    
    async def update(
        self, 
        document_id: str, 
        update_data: Dict[str, Any]
    ) -> Optional[Document]:
        """
        Update a document by its ID.
        
        Args:
            document_id: The document's unique identifier
            update_data: Dictionary of fields to update
            
        Returns:
            The updated document or None
        """
        document = await self.find_by_id(document_id)
        
        if document:
            for key, value in update_data.items():
                setattr(document, key, value)
            
            return await document.save()
        
        return None
    
    async def delete(self, document_id: str) -> bool:
        """
        Delete a document by its ID.
        
        Args:
            document_id: The document's unique identifier
            
        Returns:
            True if deletion was successful, False otherwise
        """
        document = await self.find_by_id(document_id)
        
        if document:
            await document.delete()
            return True
        
        return False


class DriverRepository(BaseRepository):
    """
    Repository for driver-specific database operations.
    """
    
    async def find_by_email(self, email: str):
        """
        Find a driver by email address.
        
        Args:
            email: The driver's email address
            
        Returns:
            The driver document or None
        """
        # Assuming there's a model with an email field
        return await self.model.find_one({"email": email})
    
    async def find_active_drivers(self, status: str = "ACTIVE"):
        """
        Find active drivers.
        
        Args:
            status: Driver status to filter by
            
        Returns:
            List of active drivers
        """
        return await self.model.find({"status": status}).to_list()


class OrderRepository(BaseRepository):
    """
    Repository for order-specific database operations.
    """
    
    async def find_recent_orders(self, user_id: int, limit: int = 10):
        """
        Find recent orders for a user.
        
        Args:
            user_id: The user's ID
            limit: Maximum number of orders to return
            
        Returns:
            List of recent orders
        """
        return await self.model.find(
            {"user_id": user_id}
        ).sort("-created_at").limit(limit).to_list()
    
    async def find_active_orders(self):
        """
        Find all active orders.
        
        Returns:
            List of active orders
        """
        return await self.model.find(
            {"status": {"$nin": ["DELIVERED", "CANCELLED"]}}
        ).to_list()