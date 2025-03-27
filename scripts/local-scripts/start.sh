#!/bin/bash

# Color definitions
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting all services...${NC}"

# Function to start a service
start_service() {
  local service=$1
  local command=$2
  
  echo -e "${YELLOW}Starting $service service...${NC}"
  
  # Navigate to service directory and execute start command
  cd "./services/$service" || {
    echo -e "${RED}Failed to navigate to $service directory${NC}"
    return 1
  }
  
  # Execute the command
  eval "$command"
  
  # Return to the root directory
  cd ../..
  
  echo -e "${GREEN}$service service started successfully!${NC}"
}

# Start each service with appropriate command

start_service "auth" "npm run start" &        # Port 5001

start_service "user-driver" "npm run start" &   # Port 3001

echo -e "${GREEN}All services are starting. Check individual logs for status.${NC}"