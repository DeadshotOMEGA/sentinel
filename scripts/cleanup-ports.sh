#!/bin/bash
# Kill processes on ports 3000 and 3001, including Docker containers

echo "🧹 Cleaning up ports..."

# Stop Docker backend container if running
if docker ps --format '{{.Names}}' | grep -q '^sentinel-backend$'; then
  echo "  Stopping Docker backend container..."
  docker-compose stop backend >/dev/null 2>&1 || true
fi

# Note: Grafana now runs on port 3002, no conflict with frontend on 3001

# Kill process on port 3000 (backend)
PORT_3000_PID=$(lsof -ti:3000 2>/dev/null)
if [ ! -z "$PORT_3000_PID" ]; then
  echo "  Killing process on port 3000 (PID: $PORT_3000_PID)"
  kill -9 $PORT_3000_PID 2>/dev/null || true
fi

# Kill process on port 3001 (frontend)
PORT_3001_PID=$(lsof -ti:3001 2>/dev/null)
if [ ! -z "$PORT_3001_PID" ]; then
  echo "  Killing process on port 3001 (PID: $PORT_3001_PID)"
  kill -9 $PORT_3001_PID 2>/dev/null || true
fi

echo "✓ Ports cleaned"
