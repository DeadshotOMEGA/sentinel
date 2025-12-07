#!/bin/bash
# Stop all Sentinel services
# Usage: ./scripts/stop-all.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PID_FILE="$PROJECT_ROOT/.service-pids"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Stopping Sentinel services...${NC}"

# Stop app services from PID file
if [ -f "$PID_FILE" ]; then
  while IFS=: read -r name pid; do
    if kill -0 "$pid" 2>/dev/null; then
      echo "Stopping $name (PID: $pid)..."
      kill "$pid" 2>/dev/null || true
    fi
  done < "$PID_FILE"
  rm -f "$PID_FILE"
fi

# Kill any remaining bun dev processes for this project
pkill -f "bun.*$PROJECT_ROOT" 2>/dev/null || true

# Wait for graceful shutdown
sleep 1

# Force kill any remaining processes on known ports
for port in 3000 5173 5174 5175; do
  pid=$(lsof -ti :$port 2>/dev/null)
  if [ -n "$pid" ]; then
    echo "Force stopping process on port $port (PID: $pid)..."
    kill -9 $pid 2>/dev/null || true
  fi
done

# Optionally stop Docker services
if [ "$1" = "--all" ]; then
  echo "Stopping Docker services..."
  docker compose -f "$PROJECT_ROOT/docker-compose.yml" down
fi

echo -e "${GREEN}All services stopped.${NC}"
echo ""
echo "Note: Docker services (postgres, redis) still running."
echo "Use --all flag to stop everything: ./scripts/stop-all.sh --all"
