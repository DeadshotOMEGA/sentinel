#!/usr/bin/env bash
set -euo pipefail

MERMAID_DIR="docs/mermaid"

if [ ! -d "$MERMAID_DIR" ]; then
  echo "Error: $MERMAID_DIR not found. Run from project root." >&2
  exit 1
fi

if ! command -v mmdc &>/dev/null; then
  echo "Error: mmdc not found. Install with: pnpm add -g @mermaid-js/mermaid-cli" >&2
  exit 1
fi

count=0
while IFS= read -r -d '' file; do
  svg="${file%.mmd}.svg"
  echo "Rendering: $file → $svg"
  mmdc -i "$file" -o "$svg"
  count=$((count + 1))
done < <(find "$MERMAID_DIR" -name '*.mmd' -print0)

echo "Done. Rendered $count diagram(s)."
