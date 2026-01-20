# Events Domain Documentation (AI-First Guide)

**Purpose:** Visitor management, event access, and temporary access documentation

**AI Context Priority:** high

**When to Load:** User working on visitors, events, temporary access, guest management

**Triggers:** visitor, event, temporary, guest, sign-in, attendee

---

## Quick Reference

### What's Here

Documentation for Sentinel's event and visitor management:
- Visitor sign-in/out
- Event creation and management
- Temporary access grants
- Attendee registration
- Guest badge assignment

### When to Create Docs Here

**Create events docs when:**
- Implementing visitor management
- Documenting event API endpoints
- Explaining temporary access logic
- Writing attendee registration guides
- Recording event/visitor decisions

**File naming:**
- `explanation-event-[topic].md`
- `reference-event-[subject].md`
- `howto-[event-task].md`

---

## Events System Overview

### Core Entities

**Visitor:**
- Name, contact info
- Organization
- Visit purpose
- Sign-in/out times
- Escort requirements
- Visit type (Official, Training, Personal, etc.)

**Event:**
- Name, description
- Start/end datetime
- Location
- Attendee capacity
- Check-in tracking
- Event type

**Event Attendee:**
- Link between member and event
- Registration status
- Check-in status
- Attendance time

### Key Features

**Visitor Management:**
- Self-service sign-in kiosk
- Escort assignment
- Automatic sign-out reminders
- Visitor badge tracking

**Event Management:**
- Event creation with capacity
- Attendee registration
- Event-specific check-ins
- Attendance reports

**Temporary Access:**
- Time-limited badges
- Location restrictions
- Auto-expiration
- Audit logging

---

## Code Locations

**Repositories:**
- [apps/backend/src/repositories/visitor-repository.ts](../../../apps/backend/src/repositories/visitor-repository.ts)
- [apps/backend/src/repositories/event-repository.ts](../../../apps/backend/src/repositories/event-repository.ts)

**Services:**
- [apps/backend/src/services/event-service.ts](../../../apps/backend/src/services/event-service.ts)
- [apps/backend/src/services/visitor-service.ts](../../../apps/backend/src/services/visitor-service.ts) (to be created)

**Routes:**
- [apps/backend/src/routes/visitors.ts](../../../apps/backend/src/routes/visitors.ts)
- [apps/backend/src/routes/events.ts](../../../apps/backend/src/routes/events.ts)

**Schema:**
- [packages/database/prisma/schema.prisma](../../../packages/database/prisma/schema.prisma) - Visitor, Event, EventAttendee models

---

## Document Examples

### Explanation Docs
- `explanation-visitor-workflow.md` - Sign-in/out process
- `explanation-event-checkins.md` - Event-specific attendance
- `explanation-temporary-access.md` - Time-limited access model

### Reference Docs
- `reference-visitor-api.md` - Visitor endpoints
- `reference-event-api.md` - Event endpoints
- `reference-visit-types.md` - Valid visit purposes

### How-to Docs
- `howto-register-visitor.md` - Create visitor sign-in
- `howto-create-event.md` - Set up new event
- `howto-register-attendees.md` - Add members to event
- `howto-track-attendance.md` - Monitor event check-ins

---

## Testing Requirements

**Visitor repository:**
- ✅ Create visitor with required fields
- ✅ Sign-out visitor
- ✅ Get active visitors (not signed out)
- ✅ Get visitor history

**Event repository:**
- ✅ Create event with dates
- ✅ Add attendees to event
- ✅ Check capacity limits
- ✅ Get event attendance
- ✅ Cannot delete event with attendees

**Event service:**
- ✅ Register member for event
- ✅ Prevent duplicate registration
- ✅ Prevent over-capacity
- ✅ Record event check-in
- ✅ Generate attendance report

---

## Business Rules

**Visitor Sign-in:**
- Requires: Name, organization, purpose, sponsor
- Optional: Contact info, expected duration
- Auto-sign-out: After 8 hours if not manually signed out
- Escort required: For certain visit types

**Event Attendance:**
- Pre-registration preferred
- Walk-in allowed if capacity available
- Check-in required for attendance credit
- Late arrival threshold: 15 minutes

**Temporary Access:**
- Maximum duration: 24 hours
- Auto-revoke after expiration
- Audit log required
- Manual extension needs approval

---

## Related Documentation

**Related domains:**
- [Personnel Domain](../personnel/CLAUDE.md) - Member attendees
- [Check-in Domain](../checkin/CLAUDE.md) - Event check-in integration

**Cross-cutting:**
- [Security](../../cross-cutting/security/CLAUDE.md) - Access control

**Implementation:**
- [Backend Rebuild Plan](../../plans/active/backend-rebuild-plan.md)

---

**Last Updated:** 2026-01-19
