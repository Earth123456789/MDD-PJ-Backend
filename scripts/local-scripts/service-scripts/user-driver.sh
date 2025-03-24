#!/bin/bash

# Color definitions
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Change to the user-driver service directory
cd "./services/user-driver" || {
  echo -e "${RED}Failed to navigate to user-driver service directory${NC}"
  exit 1
}

# Function to display usage
show_usage() {
  echo -e "${YELLOW}Usage: ./user-driver.sh [OPTION]${NC}"
  echo -e "Options:"
  echo -e "  start       Start user-driver service locally"
  echo -e "  build       Build user-driver service"
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
    echo -e "${BLUE}Starting user-driver service (Express) locally...${NC}"
    npm run start
    ;;
  build)
    echo -e "${BLUE}Building user-driver service...${NC}"
    npm run build
    ;;
  docker)
    echo -e "${BLUE}Building and running user-driver service in Docker...${NC}"
    cd ../..
    # Check for docker-compose file location
if [ -f "docker/docker-compose.yml" ]; then
  docker compose -f "docker/docker-compose.yml" up --build user-driver-service
elif [ -f "docker-compose.yml" ]; then
  docker compose -f "docker-compose.yml" up --build user-driver-service
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