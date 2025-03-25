#!/bin/bash

# Color definitions
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Restarting locally running services...${NC}"

# Find and kill processes running on typical development ports
kill_service_by_port() {
  local port=$1
  local service=$2
  
  echo -e "${YELLOW}Looking for $service on port $port...${NC}"
  local pid=$(lsof -ti:$port)
  
  if [ -n "$pid" ]; then
    echo -e "${YELLOW}Stopping $service (PID: $pid)...${NC}"
    kill -15 $pid
    sleep 1
    
    # Check if process is still running and force kill if necessary
    if ps -p $pid > /dev/null; then
      echo -e "${YELLOW}Force stopping $service (PID: $pid)...${NC}"
      kill -9 $pid
    fi
    
    echo -e "${GREEN}$service stopped successfully!${NC}"
    return 0
  else
    echo -e "${BLUE}No running $service found on port $port${NC}"
    return 1
  fi
}

# Kill services on their ports as specified in docker-compose
kill_service_by_port 5001 "Auth service"
kill_service_by_port 3001 "User-driver service"
kill_service_by_port 3002 "Matching service"
kill_service_by_port 3003 "Payment service"

# Small delay to ensure processes have time to exit
sleep 2

# Start all services again
echo -e "${BLUE}Starting all services again...${NC}"
./start.sh

echo -e "${GREEN}All services have been restarted!${NC}"