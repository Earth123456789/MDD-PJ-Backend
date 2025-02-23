#!/bin/bash

# Start the local development environment
echo "Starting local development environment..."

# Set environment variables (if necessary)
export ENVIRONMENT="development"
export DATABASE_URL="sqlite:///db.sqlite3"  # Example: change to your local database URL

# Install dependencies (if needed)
echo "Installing dependencies..."
# For Node.js
npm install
# For Python (FastAPI)
pip install -r requirements.txt

# Run local services
echo "Starting Order service locally..."
# You can replace this with whatever command you use to start your services locally
# For Node.js or Express
cd ./services/order && npm start &

echo "Starting Cargo service locally..."
cd ./services/cargo && npm start &

echo "Starting Tracking service locally..."
# Assuming FastAPI is used in Tracking service
cd ./services/tracking && uvicorn main:app --reload &

# Start your API Gateway (if running locally for testing)
echo "Starting Traefik locally..."
# Traefik may be run in a container, but in this case, we can skip it or run it separately

# Optionally, tail logs or open the browser
echo "Development environment is up and running."
echo "Visit http://localhost:8080 (Traefik dashboard) to monitor services."

# To keep the script running
wait
