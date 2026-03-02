#!/bin/bash
# Ensure local Docker services are running before dev servers start

set -euo pipefail

COMPOSE_FILE="docker-compose.yml"
CORE_SERVICES="postgres redis"
MAX_WAIT=45
MODE="${ENSURE_SERVICES_MODE:-full}"

DEV_NETWORK="sentinel-dev-net"

WIKI_CONTAINER="sentinel-wiki-dev"
WIKI_IMAGE="ghcr.io/requarks/wiki:2.5.312"
WIKI_VOLUME="sentinel_wiki_data"
WIKI_PORT="3002"

KROKI_CONTAINER="sentinel-kroki-dev"
KROKI_IMAGE="yuzutech/kroki:0.30.0"

echo "Checking Docker services..."

if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker is not running. Please start Docker and try again."
  exit 1
fi

ensure_network() {
  if docker network inspect "${DEV_NETWORK}" >/dev/null 2>&1; then
    return
  fi

  docker network create "${DEV_NETWORK}" >/dev/null
}

connect_to_network() {
  local container="$1"

  if docker inspect --format '{{json .NetworkSettings.Networks}}' "${container}" 2>/dev/null | grep -q "\"${DEV_NETWORK}\""; then
    return
  fi

  docker network connect "${DEV_NETWORK}" "${container}" >/dev/null 2>&1 || true
}

ensure_container_running() {
  local container="$1"
  local image="$2"
  shift 2

  if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
    echo "  ${container}: already running"
    connect_to_network "${container}"
    return
  fi

  if docker ps -a --format '{{.Names}}' | grep -q "^${container}$"; then
    echo "  ${container}: starting existing container"
    docker start "${container}" >/dev/null
    connect_to_network "${container}"
    return
  fi

  echo "  ${container}: creating container"
  docker run -d --name "${container}" --network "${DEV_NETWORK}" "$@" "${image}" >/dev/null
}

if [ "${MODE}" = "core" ]; then
  echo "Ensuring compose core services are running (${CORE_SERVICES})..."
  docker compose -f "${COMPOSE_FILE}" up -d ${CORE_SERVICES}
elif [ "${MODE}" = "full" ]; then
  echo "Ensuring compose services are running (core + backend/tools/monitoring profiles)..."
  docker compose \
    --profile backend \
    --profile tools \
    --profile monitoring \
    -f "${COMPOSE_FILE}" up -d
else
  echo "ERROR: Unsupported ENSURE_SERVICES_MODE '${MODE}'. Use 'core' or 'full'."
  exit 1
fi

ensure_network

ensure_container_running \
  "${WIKI_CONTAINER}" \
  "${WIKI_IMAGE}" \
  -p "${WIKI_PORT}:3000" \
  -e DB_TYPE=sqlite \
  -e DB_FILEPATH=/wiki/data/db.sqlite \
  -v "${WIKI_VOLUME}:/wiki/data"

ensure_container_running \
  "${KROKI_CONTAINER}" \
  "${KROKI_IMAGE}"

echo "Waiting for core services to be healthy..."
elapsed=0
while [ "${elapsed}" -lt "${MAX_WAIT}" ]; do
  all_healthy=true

  for service in ${CORE_SERVICES}; do
    container="sentinel-${service}"
    health=$(docker inspect --format='{{.State.Health.Status}}' "${container}" 2>/dev/null || echo "missing")
    if [ "${health}" != "healthy" ]; then
      all_healthy=false
      break
    fi
  done

  if [ "${all_healthy}" = true ]; then
    wiki_state=$(docker inspect --format='{{.State.Status}}' "${WIKI_CONTAINER}" 2>/dev/null || echo "missing")
    kroki_state=$(docker inspect --format='{{.State.Status}}' "${KROKI_CONTAINER}" 2>/dev/null || echo "missing")

    if [ "${wiki_state}" = "running" ] && [ "${kroki_state}" = "running" ]; then
      echo "All services healthy. Wiki.js available at http://localhost:${WIKI_PORT}"
      echo "Kroki dev service available to Wiki.js at http://${KROKI_CONTAINER}:8000 on ${DEV_NETWORK}"
      exit 0
    fi

    echo "Core services healthy, but Wiki.js or Kroki dev container is not running."
    exit 1
  fi

  sleep 1
  elapsed=$((elapsed + 1))
done

echo "ERROR: Services not healthy after ${MAX_WAIT}s. Check 'docker compose logs'."
exit 1
