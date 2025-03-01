#!/bin/bash

echo "Starting local development environment..."

# Set environment variables (if necessary)
export ENVIRONMENT="development"
export DATABASE_URL="sqlite:///db.sqlite3"  # Example: change to your local database URL

# Start services in separate processes from the root directory
echo "Starting Auth service..."
(cd ./services/auth && npm run build) &

echo "Starting Customer service..."
(cd ./services/customer && npm run build) &

echo "Starting Delivery service..."
(cd ./services/delivery && npm run build) &

echo "Starting Order service..."
(cd ./services/order && npm run build) &

# Wait for all background processes to finish
wait

echo "All services started successfully."
