#!/bin/bash

echo "Stopping the Docker containers..."
docker-compose -f ./docker/docker-compose.yml down
