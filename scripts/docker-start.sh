#!/bin/bash

echo "Building all services..."

docker-compose -f ./docker/docker-compose.yml build

echo "Starting the Docker containers..."

docker-compose -f ./docker/docker-compose.yml up