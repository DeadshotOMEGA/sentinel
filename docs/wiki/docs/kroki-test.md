# Kroki Rendering Test

Use this page to verify that Wiki.js is rendering diagrams through the self-hosted Kroki service.

## Expected Result

If Kroki is configured correctly, the diagram below should render as SVG instead of showing raw fenced code.

```kroki
mermaid
graph TD
  A[Open Wiki.js] --> B[Load Kroki Test Page]
  B --> C{Diagram Rendered?}
  C -->|Yes| D[Self-hosted Kroki is working]
  C -->|No| E[Check Wiki.js renderer config]
```

## Validation Notes

- Wiki.js renderer: `markdownKroki`
- Expected server: `http://sentinel-kroki-dev:8000` for local dev
- If rendering fails, re-run `pnpm wiki:configure:kroki:local`
