#!/bin/bash

# Color definitions
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Change to the auth service directory
cd "./services/auth" || {
  echo -e "${RED}Failed to navigate to auth service directory${NC}"
  exit 1
}

# Function to display usage
show_usage() {
  echo -e "${YELLOW}Usage: ./auth.sh [OPTION]${NC}"
  echo -e "Options:"
  echo -e "  start       Start auth service locally"
  echo -e "  build       Build auth service"
  echo -e "  docker      Build and run in Docker"
  echo -e "  help        Display this help message"
}

# Check if an argument was provided
if [ $# -eq 0 ]; then
  show_usage
  exit 1
fi

# Process arguments
case "$1" in
  start)
    echo -e "${BLUE}Starting auth service (Express) locally...${NC}"
    npm run start
    ;;
  build)
    echo -e "${BLUE}Building auth service...${NC}"
    npm run build
    ;;
  docker)
    echo -e "${BLUE}Building and running auth service in Docker...${NC}"
    cd ../..
    # Check for docker-compose file location
if [ -f "docker/docker-compose.yml" ]; then
  docker compose -f "docker/docker-compose.yml" up --build auth-service
elif [ -f "docker-compose.yml" ]; then
  docker compose -f "docker-compose.yml" up --build auth-service
else
  echo -e "${RED}Error: docker-compose.yml not found${NC}"
  exit 1
fi
    ;;
  help)
    show_usage
    ;;
  *)
    echo -e "${RED}Invalid option: $1${NC}"
    show_usage
    exit 1
    ;;
esac

exit 0