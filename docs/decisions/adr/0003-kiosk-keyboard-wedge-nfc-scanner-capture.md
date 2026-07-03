---
type: adr
title: 'Kiosk Keyboard-Wedge NFC Scanner Capture'
status: accepted
created: 2026-07-03
decided: 2026-07-03
ai:
  priority: high
  context_load: conditional
  triggers:
    - kiosk
    - nfc scanner
    - keyboard wedge
    - visitor self-service
    - badge scan
    - scanner focus
  token_budget: 1200
decision_makers:
  - Sentinel project owner
stakeholders:
  - Unit staff
  - Members
  - Temporary Personnel
  - Visitors
related_adrs:
  - 0001
supersedes: null
superseded_by: null
---

# ADR-0003: Kiosk Keyboard-Wedge NFC Scanner Capture

**Status:** Accepted

**Date:** 2026-07-03

**Decision Makers:** Sentinel project owner

---

## Context

The kiosk NFC scanner behaves like a keyboard: it types the badge identifier and presses Enter. The existing kiosk scan path depends on the badge input having focus, so scans can be lost when focus is in Visitor Self-Service or elsewhere on the kiosk screen.

Sentinel needs the kiosk to accept real NFC scans without requiring the cursor to be in the badge field, while preserving Visitor Self-Service text entry and avoiding surprising global keyboard capture on normal Sentinel pages.

Key factors:

- Visitor Self-Service uses normal text inputs for visitor details.
- Member and Temporary Personnel NFC scans must remain reliable at the kiosk.
- Visitor-assigned NFC Tags are not the same as Visitor Self-Service sign-out.
- Operational prompts such as DDS responsibility and lockup resolution should not be bypassed by later scans.
- Normal server and laptop Sentinel pages include many administrative forms where global capture would be surprising.
- Field testing may require scanner timing adjustments on deployed kiosks without releasing a new application version for each threshold change.

## Decision

Sentinel will support kiosk-only keyboard-wedge NFC scanner capture.

In short: the kiosk may listen globally for scanner-speed keyboard bursts ending in Enter, but normal Sentinel pages will not.

Specifically:

- Kiosk background capture will identify likely scanner input from timing and Enter termination, not from a fixed badge serial format.
- Kiosk scanner timing will have safe code defaults, preset-based Admin Settings, and advanced numeric overrides using the existing settings storage.
- Admin Settings will include a scanner timing tester that measures real keyboard-wedge samples locally without creating presence records.
- Recognized scanner input will be routed through the existing kiosk scan behavior for Member and Temporary Personnel presence.
- Scanner input may be accepted while Visitor Self-Service remains open, and the scanner burst must not become Visitor form content.
- Manual badge typing still requires the explicit staff fallback badge field.
- Visitor-assigned NFC Tags keep the current behavior unless a separate Visitor sign-out scan design is approved.
- Background scanner capture pauses while operational prompts or modals are waiting for a decision, including DDS responsibility and lockup checkout resolution.
- The global scanner listener is scoped to the kiosk experience and is not enabled across normal Sentinel server or laptop pages.
- Invalid or missing scanner timing settings fall back to safe code defaults.
- The scanner timing tester masks badge identifiers and keeps sample data local to the browser session.

## Options Considered

### Option 1: Kiosk-only timing-based capture

Description: Detect scanner-speed key bursts on the kiosk screen and submit those candidates to the existing badge lookup, with safe defaults, Admin Settings presets, advanced timing overrides, and a local calibration tester for field samples.

Pros:

- Fixes lost scans when the badge field is not focused.
- Preserves Visitor Self-Service typing by distinguishing scanner bursts from manual typing.
- Avoids hard-coding badge serial patterns.
- Keeps normal Sentinel pages free of unexpected global keyboard behavior.
- Allows deployed kiosks to tune timing thresholds without a patch release for each calibration change.
- Lets staff measure real scanner timing before changing thresholds.

Cons:

- Requires careful timing thresholds and tests.
- Extremely fast manual input could be treated as scanner input.
- Adds a small Admin Settings surface that must validate bounds clearly and avoid recording presence during calibration.

Why chosen: This best matches the physical scanner behavior and limits keyboard capture to the kiosk context where the dedicated scanner exists.

### Option 2: Keep relying on autofocus and refocus

Description: Continue trying to keep the badge input focused after taps or flow changes.

Pros:

- Smaller implementation.
- Keeps all input handling in the existing field.

Cons:

- Does not solve scans that occur while Visitor Self-Service fields have legitimate focus.
- Makes reliable scanning depend on cursor state rather than the physical scanner.

Why not chosen: The core problem is focus dependency, so more refocusing only reduces the failure window.

### Option 3: App-wide scanner capture

Description: Enable global scanner capture throughout Sentinel.

Pros:

- Could support scanner workflows outside the kiosk.

Cons:

- Normal server and laptop pages contain many forms where global capture would surprise staff.
- Creates broader regression risk outside the kiosk workflow.

Why not chosen: The current scanner problem is kiosk-specific, and broader scanner capture should be designed per workflow.

### Option 4: Serial-format based capture

Description: Treat input as scanner input only when it matches a particular badge serial pattern.

Pros:

- Easy to reason about if all badge serials share one stable format.

Cons:

- Badge serial formats may vary by device, import, or future tag type.
- Forces the UI to know hardware data-shape rules that the badge lookup already validates.

Why not chosen: Timing-based recognition follows the keyboard-wedge hardware behavior without freezing badge serial format assumptions into the UI.

## Consequences

Positive consequences:

- Kiosk scans no longer depend on the visible badge field having focus.
- Visitors can keep using self-service forms without scanner bursts polluting form fields.
- Member and Temporary Personnel presence can be recorded while Visitor Self-Service remains in progress.

Negative consequences:

- Kiosk input handling becomes more complex and needs focused tests around timing, Enter handling, and prompt/modal blocking.
- Scanner behavior depends on thresholds that may need adjustment if hardware changes.
- Scanner timing settings become operational configuration and should be kept bounded and recoverable.
- Calibration samples are diagnostic aids, not operational records.

Risks and mitigations:

- Risk: A fast typist or pasted input is treated as a scan. Mitigation: require scanner-like timing, Enter termination, reasonable length, known-badge lookup, and bounded settings.
- Risk: A scan occurs during an operational decision. Mitigation: pause background capture while DDS responsibility or lockup prompts are open.
- Risk: Future developers expand capture globally. Mitigation: document kiosk-only scope and keep the implementation behind kiosk components/hooks.
- Risk: Bad calibration disables real scans. Mitigation: validate settings, show defaults, and provide reset-to-default behavior.
- Risk: Calibration accidentally records attendance. Mitigation: the tester captures keyboard timing locally and never calls the scan API.
