#!/bin/bash
# Start all Sentinel services for E2E testing
# Usage: ./scripts/start-all.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_ROOT/.logs"
PID_FILE="$PROJECT_ROOT/.service-pids"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

mkdir -p "$LOG_DIR"

echo -e "${YELLOW}Starting Sentinel services...${NC}"

# 1. Start Docker services (postgres, redis)
echo -e "${GREEN}[1/5]${NC} Starting Docker services..."
docker compose -f "$PROJECT_ROOT/docker-compose.yml" up -d

# Wait for postgres
echo -n "Waiting for PostgreSQL..."
until docker exec sentinel-postgres pg_isready -U sentinel > /dev/null 2>&1; do
  echo -n "."
  sleep 1
done
echo -e " ${GREEN}ready${NC}"

# Wait for redis
echo -n "Waiting for Redis..."
until docker exec sentinel-redis redis-cli ping > /dev/null 2>&1; do
  echo -n "."
  sleep 1
done
echo -e " ${GREEN}ready${NC}"

# Clear previous PIDs
> "$PID_FILE"

# 2. Start Backend
echo -e "${GREEN}[2/5]${NC} Starting Backend (port 3001)..."
cd "$PROJECT_ROOT/backend"
bun run dev > "$LOG_DIR/backend.log" 2>&1 &
echo "backend:$!" >> "$PID_FILE"

# 3. Start Frontend (Admin Dashboard)
echo -e "${GREEN}[3/5]${NC} Starting Frontend (port 5173)..."
cd "$PROJECT_ROOT/frontend"
bun run dev > "$LOG_DIR/frontend.log" 2>&1 &
echo "frontend:$!" >> "$PID_FILE"

# 4. Start Kiosk
echo -e "${GREEN}[4/5]${NC} Starting Kiosk (port 5174)..."
cd "$PROJECT_ROOT/kiosk"
bun run dev > "$LOG_DIR/kiosk.log" 2>&1 &
echo "kiosk:$!" >> "$PID_FILE"

# 5. Start TV Display
echo -e "${GREEN}[5/5]${NC} Starting TV Display (port 5175)..."
cd "$PROJECT_ROOT/tv-display"
bun run dev > "$LOG_DIR/tv-display.log" 2>&1 &
echo "tv-display:$!" >> "$PID_FILE"

# Wait for services to be ready
echo ""
echo -n "Waiting for services to start..."
sleep 3

# Health check each service
check_port() {
  nc -z localhost "$1" 2>/dev/null
}

max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
  all_ready=true

  check_port 3000 || all_ready=false
  check_port 5173 || all_ready=false
  check_port 5174 || all_ready=false
  check_port 5175 || all_ready=false

  if $all_ready; then
    break
  fi

  echo -n "."
  sleep 1
  attempt=$((attempt + 1))
done

echo ""

if $all_ready; then
  echo -e "${GREEN}All services started successfully!${NC}"
  echo ""
  echo "Services running:"
  echo "  Backend API:    http://localhost:3000"
  echo "  Frontend:       http://localhost:5173"
  echo "  Kiosk:          http://localhost:5174"
  echo "  TV Display:     http://localhost:5175"
  echo ""
  echo "Logs: $LOG_DIR/"
  echo "Stop: ./scripts/stop-all.sh"
else
  echo -e "${RED}Some services failed to start. Check logs in $LOG_DIR/${NC}"
  exit 1
fi
