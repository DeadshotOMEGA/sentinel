# Label Meanings and Examples

## Type

- `type:bug`: incorrect behavior. Example: sentinel.local DNS regression.
- `type:feature`: new capability. Example: admin badge provisioning flow.
- `type:task`: implementation work without new product surface.
- `type:refactor`: structural cleanup preserving behavior.

## Area

- `area:backend`: API/service changes.
- `area:frontend`: admin/kiosk UI changes.
- `area:database`: schema/migration/query changes.
- `area:infra`: CI/CD, deployment, operations.
- `area:auth`: identity/session/authorization logic.
- `area:logging`: telemetry/observability/logging changes.
- `area:hardware`: scanner/device integration.

## Status

- `status:triage`: new/reopened intake.
- `status:planned`: accepted and queued.
- `status:working`: currently being implemented.
- `status:blocked`: cannot proceed due blocker.
- `status:done`: implementation complete.

## Priority

- `priority:p0`: urgent/release-blocking.
- `priority:p1`: high importance.
- `priority:p2`: normal.
