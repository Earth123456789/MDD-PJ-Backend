# FastAPI Order Management Service

A robust REST API for order management with PostgreSQL database, RabbitMQ for messaging, and Tortoise ORM.

## Features

- Complete CRUD operations for orders and order items
- Order status tracking with history
- Price calculation based on weight, distance, and urgency
- RabbitMQ integration for event-driven architecture
- Swagger documentation
- Containerized with Docker and Docker Compose
- Comprehensive test suite

## Project Structure

```
order-management-service/
├── config/
│   ├── __init__.py
│   ├── config.py
│   └── rabbitmq.py
├── controller/
│   ├── __init__.py
│   └── order_controller.py
├── data/
│   └── init.sql
├── models/
│   └── models.py
├── routes/
│   ├── __init__.py
│   └── order_routes.py
├── tests/
│   ├── __init__.py
│   ├── test_controller.py
│   └── test_orders.py
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── main.py
├── requirements.txt
├── schemas.py
└── README.md
```

## API Endpoints

- `GET /api/v1/orders` - List all orders with pagination and filters
- `POST /api/v1/orders` - Create a new order
- `GET /api/v1/orders/{order_id}` - Get order details by ID
- `PUT /api/v1/orders/{order_id}` - Update order details
- `DELETE /api/v1/orders/{order_id}` - Delete an order
- `PUT /api/v1/orders/{order_id}/status` - Update order status
- `POST /api/v1/orders/{order_id}/calculate-price` - Calculate order price
- `GET /api/v1/orders/{order_id}/price-history` - Get price calculation history
- `GET /api/v1/orders/{order_id}/status-history` - Get status change history
- `POST /api/v1/orders/{order_id}/items` - Add item to order
- `PUT /api/v1/orders/{order_id}/items/{item_id}` - Update order item
- `DELETE /api/v1/orders/{order_id}/items/{item_id}` - Delete order item

## Database Models

- `Orders` - Main order information
- `OrderItems` - Individual items in an order
- `PriceCalculations` - Price calculation details
- `OrderStatusHistory` - Status change history

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Python 3.10+ (for local development)

### Running with Docker Compose

1. Clone the repository
2. Copy `.env.example` to `.env` and adjust values if needed
3. Start the services:

```bash
docker-compose up -d
```

4. Access the API documentation at http://localhost:8000/api/v1/docs

### Local Development Setup

1. Clone the repository
2. Create a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows, use: venv\Scripts\activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Copy `.env.example` to `.env` and adjust values for your environment
5. Start PostgreSQL and RabbitMQ (via Docker or installed locally)
6. Run the application:

```bash
uvicorn main:app --reload
```

### Running Tests

```bash
pytest
```

## Messaging

The service uses RabbitMQ to publish events such as:

- `order_created`
- `order_updated`
- `order_deleted`
- `order_status_updated`
- `order_item_added`
- `order_item_updated`
- `order_item_deleted`
- `order_price_calculated`

These events can be consumed by other services for further processing.

## Development

The service uses:

- FastAPI for the web framework
- Tortoise ORM for database access
- PostgreSQL for data storage
- RabbitMQ for messaging
- Pydantic for data validation

## License

This project is licensed under the MIT License.