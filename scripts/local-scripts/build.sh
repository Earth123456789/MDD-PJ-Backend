#!/bin/bash

# Color definitions
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Building all services...${NC}"

# Function to build a service
build_service() {
  local service=$1
  
  echo -e "${YELLOW}Building $service service...${NC}"
  
  # Navigate to service directory
  cd "./services/$service" || {
    echo -e "${RED}Failed to navigate to $service directory${NC}"
    return 1
  }
  
  # Install dependencies if needed
  if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies for $service...${NC}"
    npm install
  fi
  
  # Build the service
  npm run build
  
  # Check if build was successful
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}$service built successfully!${NC}"
  else
    echo -e "${RED}Failed to build $service${NC}"
  fi
  
  # Return to the root directory
  cd ../..
}

# Build each service
build_service "payment"
build_service "auth"
build_service "matching"
build_service "user-driver"

echo -e "${GREEN}All services have been built!${NC}"