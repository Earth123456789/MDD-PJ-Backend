#!/bin/bash

# Color definitions
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Restarting all Docker containers...${NC}"

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

# Parse arguments to determine if specific services should be restarted
SERVICES=""
if [ $# -gt 0 ]; then
  SERVICES="$@"
  echo -e "${YELLOW}Restarting specific services: $SERVICES${NC}"
else
  echo -e "${YELLOW}Restarting all services${NC}"
fi

# Run docker compose down
echo -e "${YELLOW}Stopping containers...${NC}"
if [ -z "$SERVICES" ]; then
  docker compose -f "$COMPOSE_FILE" down
else
  docker compose -f "$COMPOSE_FILE" stop $SERVICES
fi

# Check if docker compose down/stop was successful
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to stop containers${NC}"
  exit 1
fi

# Run docker compose up
echo -e "${YELLOW}Starting containers...${NC}"
if [ -z "$SERVICES" ]; then
  docker compose -f "$COMPOSE_FILE" up -d
else
  docker compose -f "$COMPOSE_FILE" up -d $SERVICES
fi

# Check if docker compose up was successful
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Containers have been restarted successfully!${NC}"
else
  echo -e "${RED}Failed to restart containers${NC}"
  exit 1
fi

# Show active containers
echo -e "${BLUE}Active containers:${NC}"
docker compose -f "$COMPOSE_FILE" ps