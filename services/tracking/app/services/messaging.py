import json
import logging
import asyncio
from typing import Dict, Any, Optional, Callable, Awaitable
import aio_pika
from aio_pika import Message, ExchangeType
from aio_pika.abc import AbstractIncomingMessage

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class RabbitMQService:
    """
    Service for handling RabbitMQ messaging.
    """
    
    def __init__(self):
        self.connection = None
        self.channel = None
        self.exchange = None
        self.queue_prefix = settings.RABBITMQ_QUEUE_PREFIX
        self.event_handlers = {}
        self.is_connected = False
    
    async def connect(self):
        """
        Connect to RabbitMQ server.
        """
        if self.is_connected:
            return
        
        try:
            # Connect to RabbitMQ
            self.connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
            self.channel = await self.connection.channel()
            
            # Create topic exchange
            self.exchange = await self.channel.declare_exchange(
                f"{self.queue_prefix}.topic",
                ExchangeType.TOPIC,
                durable=True
            )
            
            self.is_connected = True
            logger.info("Connected to RabbitMQ")
        except Exception as e:
            logger.error(f"Failed to connect to RabbitMQ: {e}")
            raise
    
    async def close(self):
        """
        Close the RabbitMQ connection.
        """
        if self.connection and not self.connection.is_closed:
            await self.connection.close()
            self.is_connected = False
            logger.info("Closed RabbitMQ connection")
    
    async def publish_message(self, routing_key: str, message_data: Dict[str, Any]):
        """
        Publish a message to RabbitMQ.
        
        Args:
            routing_key: The routing key for the message
            message_data: The message data to publish
        """
        if not self.is_connected:
            await self.connect()
        
        try:
            # Convert message data to JSON
            message_body = json.dumps(message_data).encode()
            
            # Create message with appropriate headers
            message = Message(
                body=message_body,
                content_type="application/json",
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                headers={
                    "source": settings.APP_NAME,
                    "timestamp": message_data.get("timestamp", ""),
                }
            )
            
            # Publish message to exchange
            await self.exchange.publish(
                message=message,
                routing_key=routing_key
            )
            
            logger.debug(f"Published message to {routing_key}: {message_data}")
        except Exception as e:
            logger.error(f"Failed to publish message to {routing_key}: {e}")
            raise
    
    async def subscribe(
        self, 
        routing_key: str, 
        callback: Callable[[Dict[str, Any]], Awaitable[None]], 
        queue_name: Optional[str] = None
    ):
        """
        Subscribe to messages from RabbitMQ.
        
        Args:
            routing_key: The routing key to subscribe to
            callback: The callback function to call when a message is received
            queue_name: Optional queue name, will be auto-generated if not provided
        """
        if not self.is_connected:
            await self.connect()
        
        try:
            # If queue name not provided, generate one based on routing key
            if not queue_name:
                queue_name = f"{self.queue_prefix}.{routing_key.replace('.', '_')}"
            
            # Declare queue
            queue = await self.channel.declare_queue(
                queue_name,
                durable=True,
                auto_delete=False
            )
            
            # Bind queue to exchange with routing key
            await queue.bind(
                exchange=self.exchange,
                routing_key=routing_key
            )
            
            # Store callback
            self.event_handlers[routing_key] = callback
            
            # Start consuming messages
            await queue.consume(
                callback=lambda message: self._process_message(message, routing_key),
                no_ack=False
            )
            
            logger.info(f"Subscribed to {routing_key} with queue {queue_name}")
        except Exception as e:
            logger.error(f"Failed to subscribe to {routing_key}: {e}")
            raise
    
    async def _process_message(self, message: AbstractIncomingMessage, routing_key: str):
        """
        Process incoming message from RabbitMQ.
        
        Args:
            message: The incoming message
            routing_key: The routing key
        """
        async with message.process():
            try:
                # Get message body as JSON
                if message.content_type == "application/json":
                    message_data = json.loads(message.body.decode())
                else:
                    message_data = {"body": message.body.decode()}
                
                # Get callback function
                callback = self.event_handlers.get(routing_key)
                
                if callback:
                    # Call callback function
                    await callback(message_data)
                    logger.debug(f"Processed message from {routing_key}")
                else:
                    logger.warning(f"No handler for message from {routing_key}")
            except json.JSONDecodeError:
                logger.error(f"Failed to decode JSON message from {routing_key}")
            except Exception as e:
                logger.error(f"Error processing message from {routing_key}: {e}")
                # Requeue message if processing failed
                await message.reject(requeue=True)