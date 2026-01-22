#!/bin/bash
# scripts/check-prisma-imports.sh
# Check for direct prisma imports that should use database service

set -e

echo "🔍 Checking for direct prisma imports in routes..."
echo ""

# Search for problematic imports
ROUTE_FILES=$(find apps/backend/src/routes -name "*.ts" -type f 2>/dev/null || true)

if [ -z "$ROUTE_FILES" ]; then
  echo "⚠️  No route files found in apps/backend/src/routes"
  exit 0
fi

ISSUES_FOUND=0

for file in $ROUTE_FILES; do
  # Check if file imports prisma from @sentinel/database
  if grep -q "import.*prisma.*from '@sentinel/database'" "$file"; then
    echo "❌ $file imports prisma directly"
    echo "   Should use: import { getPrismaClient } from '../lib/database.js'"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
  fi

  # Check for await prisma. usage (but not getPrismaClient().prisma)
  if grep -q "await prisma\." "$file" && ! grep -q "getPrismaClient" "$file"; then
    echo "⚠️  $file uses 'await prisma.' directly"
    echo "   Should use: await getPrismaClient()."
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
  fi
done

echo ""
if [ $ISSUES_FOUND -eq 0 ]; then
  echo "✅ No issues found - all routes use database service"
  exit 0
else
  echo "❌ Found $ISSUES_FOUND issue(s)"
  echo ""
  echo "Fix by:"
  echo "1. Replace: import { prisma } from '@sentinel/database'"
  echo "   With: import { getPrismaClient } from '../lib/database.js'"
  echo "2. Replace: await prisma."
  echo "   With: await getPrismaClient()."
  exit 1
fi
