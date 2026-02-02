# Visitor Sign-in Diagrams

Mermaid diagrams for the visitor sign-in/sign-out system.

## Files

| File                    | Description                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `sign-in-flow.mmd`  | Visitor sign-in process: admin panel or kiosk self-service, optional temporary badge assignment, database writes, and WebSocket broadcasts |
| `sign-out-flow.mmd` | Visitor sign-out via kiosk badge scan or admin panel: checkout process, badge release, and broadcasts                                      |
| `tables-updated.mmd`| Summary of all database tables and columns affected during sign-in and sign-out operations                                                 |

## Rendering

Generate SVGs with Mermaid CLI:

```bash
# Single file
mmdc -i sign-in-flow.mmd -o sign-in-flow.svg

# All files in this directory
for f in *.mmd; do mmdc -i "$f" -o "${f%.mmd}.svg"; done
```
