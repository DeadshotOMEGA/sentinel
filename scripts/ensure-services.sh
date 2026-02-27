#!/bin/bash
# Ensure local Docker services are running before dev servers start

set -e

COMPOSE_FILE="docker-compose.yml"
CORE_SERVICES="postgres redis"
MAX_WAIT=45
MODE="${ENSURE_SERVICES_MODE:-full}"
WIKI_CONTAINER="sentinel-wiki-dev"
WIKI_IMAGE="ghcr.io/requarks/wiki:2.5.312"
WIKI_VOLUME="sentinel_wiki_data"
WIKI_PORT="3002"

echo "Checking Docker services..."

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker is not running. Please start Docker and try again."
  exit 1
fi

# Start all docker-compose containers (including profile-scoped services)
if [ "$MODE" = "core" ]; then
  echo "Ensuring compose core services are running (${CORE_SERVICES})..."
  docker compose -f "$COMPOSE_FILE" up -d $CORE_SERVICES
elif [ "$MODE" = "full" ]; then
  echo "Ensuring compose services are running (core + backend/tools/monitoring profiles)..."
  docker compose \
    --profile backend \
    --profile tools \
    --profile monitoring \
    -f "$COMPOSE_FILE" up -d
else
  echo "ERROR: Unsupported ENSURE_SERVICES_MODE '${MODE}'. Use 'core' or 'full'."
  exit 1
fi

# Ensure local Wiki.js dev container is running on localhost:3002
if docker ps --format '{{.Names}}' | grep -q "^${WIKI_CONTAINER}$"; then
  echo "  wikijs: already running (${WIKI_CONTAINER})"
else
  if docker ps -a --format '{{.Names}}' | grep -q "^${WIKI_CONTAINER}$"; then
    echo "  wikijs: starting existing container (${WIKI_CONTAINER})"
    docker start "$WIKI_CONTAINER" >/dev/null
  else
    echo "  wikijs: creating dev container (${WIKI_CONTAINER})"
    docker run -d \
      --name "$WIKI_CONTAINER" \
      -p "${WIKI_PORT}:3000" \
      -e DB_TYPE=sqlite \
      -e DB_FILEPATH=/wiki/data/db.sqlite \
      -v "${WIKI_VOLUME}:/wiki/data" \
      "$WIKI_IMAGE" >/dev/null
  fi
fi

# Wait for core compose services to become healthy
echo "Waiting for core services to be healthy..."
elapsed=0
while [ $elapsed -lt $MAX_WAIT ]; do
  all_healthy=true
  for service in $CORE_SERVICES; do
  container="sentinel-${service}"
    health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "missing")
    if [ "$health" != "healthy" ]; then
      all_healthy=false
      break
    fi
  done

  if [ "$all_healthy" = true ]; then
    wiki_state=$(docker inspect --format='{{.State.Status}}' "$WIKI_CONTAINER" 2>/dev/null || echo "missing")
    if [ "$wiki_state" = "running" ]; then
      echo "All services healthy. Wiki.js available at http://localhost:${WIKI_PORT}"
      exit 0
    fi
    echo "Core services healthy, but Wiki.js container is not running."
    exit 1
  fi

  sleep 1
  elapsed=$((elapsed + 1))
done

echo "ERROR: Services not healthy after ${MAX_WAIT}s. Check 'docker compose logs'."
exit 1
    exit 0
  fi

  sleep 1
  elapsed=$((elapsed + 1))
done

echo "ERROR: Services not healthy after ${MAX_WAIT}s. Check 'docker compose logs'."
exit 1
