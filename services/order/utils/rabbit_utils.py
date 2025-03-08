import json
import pika
import logging
from config.settings import (
    RABBITMQ_HOST,
    RABBITMQ_PORT,
    RABBITMQ_USER,
    RABBITMQ_PASSWORD,
    RABBITMQ_QUEUE,
    RABBITMQ_EXCHANGE,
    RABBITMQ_ROUTING_KEY,
)

logger = logging.getLogger(__name__)


class RabbitMQClient:
    """Client for interacting with RabbitMQ."""

    def __init__(self):
        self.host = RABBITMQ_HOST
        self.port = RABBITMQ_PORT
        self.username = RABBITMQ_USER
        self.password = RABBITMQ_PASSWORD
        self.queue = RABBITMQ_QUEUE
        self.exchange = RABBITMQ_EXCHANGE
        self.routing_key = RABBITMQ_ROUTING_KEY
        self.connection = None
        self.channel = None

    def connect(self):
        """Establish connection to RabbitMQ server."""
        if self.connection is None or self.connection.is_closed:
            credentials = pika.PlainCredentials(self.username, self.password)
            parameters = pika.ConnectionParameters(
                host=self.host,
                port=self.port,
                credentials=credentials
            )
            self.connection = pika.BlockingConnection(parameters)
            self.channel = self.connection.channel()
            
            # Declare exchange and queue
            self.channel.exchange_declare(
                exchange=self.exchange,
                exchange_type='direct',
                durable=True
            )
            
            self.channel.queue_declare(
                queue=self.queue,
                durable=True
            )
            
            self.channel.queue_bind(
                queue=self.queue,
                exchange=self.exchange,
                routing_key=self.routing_key
            )
            
            logger.info(f"Connected to RabbitMQ at {self.host}:{self.port}")
        return self.channel

    def close(self):
        """Close the connection to RabbitMQ."""
        if self.connection and self.connection.is_open:
            self.connection.close()
            logger.info("Closed connection to RabbitMQ")
    
    def publish_message(self, message, message_type=None):
        """
        Publish a message to the RabbitMQ exchange
        
        Args:
            message: Dictionary containing the message data
            message_type: Type of message (e.g., 'order.created', 'order.updated')
        """
        try:
            channel = self.connect()
            
            # Add message type to properties if provided
            properties = None
            if message_type:
                properties = pika.BasicProperties(
                    content_type='application/json',
                    type=message_type,
                    delivery_mode=2  # make message persistent
                )
            
            # Convert message to JSON string
            message_json = json.dumps(message)
            
            # Publish message
            channel.basic_publish(
                exchange=self.exchange,
                routing_key=self.routing_key,
                body=message_json,
                properties=properties
            )
            
            logger.info(f"Published message: {message_type or 'message'}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to publish message: {str(e)}")
            return False


# Singleton instance
rabbit_client = RabbitMQClient()