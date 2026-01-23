#!/bin/bash

#
# Cleanup Test Containers - Safe Script
#
# This script ONLY removes containers labeled with sentinel.test=true
# It will NOT affect:
# - Development containers (Grafana, Loki, Prometheus)
# - Production containers
# - Other project containers
#

set -e

echo "🔍 Searching for Sentinel test containers..."
echo ""

# Find containers with sentinel.test=true label
TEST_CONTAINERS=$(docker ps -aq --filter "label=sentinel.test=true" 2>/dev/null || true)

if [ -z "$TEST_CONTAINERS" ]; then
  echo "✅ No test containers found to clean up"
  exit 0
fi

# Count containers
CONTAINER_COUNT=$(echo "$TEST_CONTAINERS" | wc -l)

echo "Found $CONTAINER_COUNT test container(s):"
echo ""

# Show details of containers to be removed
docker ps -a --filter "label=sentinel.test=true" --format "table {{.ID}}\t{{.Image}}\t{{.Status}}\t{{.Names}}"

echo ""
echo "⚠️  These containers will be STOPPED and REMOVED"
echo ""

# Ask for confirmation (can be skipped with --force flag)
if [ "$1" != "--force" ]; then
  read -p "Continue? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cleanup cancelled"
    exit 1
  fi
fi

echo ""
echo "🧹 Stopping test containers..."
echo "$TEST_CONTAINERS" | xargs -r docker stop 2>/dev/null || true

echo "🗑️  Removing test containers..."
echo "$TEST_CONTAINERS" | xargs -r docker rm 2>/dev/null || true

echo ""
echo "✅ Test container cleanup complete!"
echo ""
echo "ℹ️  Development containers (Grafana, Loki, Prometheus) were NOT affected"
echo "ℹ️  To see remaining containers: docker ps -a"
