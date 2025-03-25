#!/bin/bash

# Color definitions
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Stopping all Docker containers...${NC}"

# Check if docker-compose.yml exists in the docker directory
if [ ! -f "docker/docker-compose.yml" ]; then
  echo -e "${YELLOW}docker-compose.yml not found in docker directory, checking root...${NC}"
  
  # Check if it exists in the root as a fallback
  if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}Error: docker-compose.yml not found in docker directory or root directory${NC}"
    exit 1
  else
    COMPOSE_FILE="docker-compose.yml"
  fi
else
  COMPOSE_FILE="docker/docker-compose.yml"
  echo -e "${GREEN}Using docker-compose file at docker/docker-compose.yml${NC}"
fi

# Run docker compose down
echo -e "${YELLOW}Running docker compose down...${NC}"
docker compose -f "$COMPOSE_FILE" down "$@"

# Check if docker compose down was successful
if [ $? -eq 0 ]; then
  echo -e "${GREEN}All containers have been stopped successfully!${NC}"
else
  echo -e "${RED}Failed to stop containers${NC}"
  exit 1
fi