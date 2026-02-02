# System Flow Diagrams

Mermaid diagrams for the Sentinel RFID attendance tracking system.

## Shared Diagrams

| File                    | Description                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| `badge-scan-router.mmd` | Top-level kiosk scan routing: determines badge type (member/temporary) and routes to the correct flow |
| `websocket-events.mmd`  | Unified WebSocket event map for all system broadcasts: check-ins, DDS, presence, and visitors    |

## Subdirectories

| Directory          | Description                                                          |
| ------------------ | -------------------------------------------------------------------- |
| `scan-system/`     | Member badge scanning: check-in/out, DDS acceptance, lockup eligibility |
| `visitor-sign-in/` | Visitor sign-in/out: admin and kiosk paths, badge assignment, database operations |

## Rendering

Generate SVGs with Mermaid CLI:

```bash
# Single file
mmdc -i badge-scan-router.mmd -o badge-scan-router.svg

# All files recursively
find . -name "*.mmd" -exec sh -c 'mmdc -i "$1" -o "${1%.mmd}.svg"' _ {} \;
```
