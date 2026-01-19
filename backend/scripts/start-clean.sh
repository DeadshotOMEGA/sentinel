#!/bin/bash
# Auto-cleanup script to prevent duplicate backend processes
# Kills any existing process on port 3000 before starting

echo "🧹 Checking for existing backend processes on port 3000..."

# Kill any existing backend on port 3000
if lsof -ti :3000 >/dev/null 2>&1; then
  echo "⚠️  Found existing process(es) on port 3000, cleaning up..."
  lsof -ti :3000 | xargs kill -9 2>/dev/null || true
  echo "✓ Cleaned up existing processes"
  sleep 1
else
  echo "✓ Port 3000 is free"
fi

# Start backend
echo "🚀 Starting backend..."
cd "$(dirname "$0")/.."
exec bun run dev
