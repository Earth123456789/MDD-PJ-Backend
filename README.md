# Microservices Project (Shopdee)

## Prerequisites

- Node.js and npm installed
- Docker and Docker Compose installed
- Bash shell environment (Linux/macOS/WSL/Git Bash)

## Script Overview

| Script Name | Purpose |
|------------|---------|
| `build.sh` | Builds all services |
| `start.sh` | Starts all services locally |
| `restart.sh` | Restarts locally running services |
| `compose.sh` | Runs docker compose for all services |
| `compose-down.sh` | Stops docker containers |
| `compose-restart.sh` | Restarts docker containers |
| `auth.sh` | Manages the auth service |
| `payment.sh` | Manages the payment service |
| `matching.sh` | Manages the matching service |
| `user-driver.sh` | Manages the user-driver service |

## Setup Instructions

1. Clone the repository
2. Make all scripts executable:
   ```bash
   chmod +x *.sh
   ```
3. Ensure your environment variables are correctly set in each service's `.env` file

## Main Scripts

### Building Services + Start (in Local)

```sh
./scripts/local-scripts/build.sh
```

```sh
./scripts/local-scripts/start.sh
```

# Restart Services (in Local)

```sh
./scripts/local-scripts/restart.sh
```

### For Docker compose

- compose-up
```sh
./scripts/docker-scripts/compose.sh
```

- compose-down
```sh
./scripts/docker-scripts/compose-down.sh
```

- compose-restart
```sh
./scripts/docker-scripts/compose-restart.sh
```

