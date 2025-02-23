#!/bin/bash

echo "Deploying the project..."
docker-compose -f ./docker/docker-compose.yml up --build -d
