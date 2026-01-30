#!/bin/bash
# Ensure Docker services (postgres, redis) are running before dev servers start

set -e

COMPOSE_FILE="docker-compose.yml"
SERVICES="postgres redis"
MAX_WAIT=30

echo "Checking Docker services..."

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker is not running. Please start Docker and try again."
  exit 1
fi

# Check each core service and start if needed
NEEDS_START=false
for service in $SERVICES; do
  container="sentinel-${service}"
  if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
    echo "  ${service}: already running"
  else
    echo "  ${service}: not running"
    NEEDS_START=true
  fi
done

if [ "$NEEDS_START" = true ]; then
  echo "Starting core services..."
  docker compose -f "$COMPOSE_FILE" up -d $SERVICES
fi

# Wait for healthy status
echo "Waiting for services to be healthy..."
elapsed=0
while [ $elapsed -lt $MAX_WAIT ]; do
  all_healthy=true
  for service in $SERVICES; do
    container="sentinel-${service}"
    health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "missing")
    if [ "$health" != "healthy" ]; then
      all_healthy=false
      break
    fi
  done

  if [ "$all_healthy" = true ]; then
    echo "All services healthy."
    exit 0
  fi

  sleep 1
  elapsed=$((elapsed + 1))
done

echo "ERROR: Services not healthy after ${MAX_WAIT}s. Check 'docker compose logs'."
exit 1
