# Scan System Diagrams

Mermaid diagrams for the RFID badge scan system including check-in/out, DDS, and lockup flows.

## Files

| File | Description |
|------|-------------|
| `main-scan-flow.mmd` | Top-level badge scan flow: member lookup, direction routing, check-in with DDS gating, check-out with lockup blocking |
| `dds-acceptance-flow.mmd` | DDS auto-acceptance subprocess: assignment validation, status transitions, audit logging, and lockup acquisition |
| `dds-determination-flow.mmd` | How today's DDS is resolved: dds_assignments table lookup with weekly schedule fallback and 3 AM operational cutoff |
| `lockup-eligibility.mmd` | Determines if a member can receive lockup responsibility based on active qualifications |
## Rendering

Generate SVGs with Mermaid CLI:

```bash
# Single file
mmdc -i main-scan-flow.mmd -o main-scan-flow.svg

# All files in this directory
for f in *.mmd; do mmdc -i "$f" -o "${f%.mmd}.svg"; done
```
