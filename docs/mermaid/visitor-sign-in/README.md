# Visitor Sign-in Diagrams

Mermaid diagrams for the visitor sign-in/sign-out system.

## Files

| File                    | Description                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `sign-in-flow.mmd`      | Admin panel visitor sign-in process: form entry, optional temporary badge assignment, database writes, and WebSocket broadcasts |
| `sign-out-flow.mmd`     | Visitor sign-out via kiosk badge scan or admin panel: checkout process, badge release, and broadcasts                           |
| `badge-scan-router.mmd` | Updated top-level kiosk scan routing: determines if a scanned badge belongs to a member or a visitor and routes accordingly     |
| `tables-updated.mmd`    | Summary of all database tables and columns affected during sign-in and sign-out operations                                      |
| `websocket-events.mmd`  | Complete WebSocket event map including visitor events alongside existing member/DDS/presence events                             |

## Rendering

Generate SVGs with Mermaid CLI:

```bash
# Single file
mmdc -i sign-in-flow.mmd -o sign-in-flow.svg

# All files in this directory
for f in *.mmd; do mmdc -i "$f" -o "${f%.mmd}.svg"; done
```
