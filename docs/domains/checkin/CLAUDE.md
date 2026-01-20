# Check-in Domain Documentation (AI-First Guide)

**Purpose:** Badge scanning, check-in/out, and presence tracking documentation

**AI Context Priority:** high

**When to Load:** User working on check-ins, badge scans, presence, activity

**Triggers:** checkin, check-in, badge, scan, presence, activity, in, out

---

## Quick Reference

### What's Here

Documentation for Sentinel's check-in system:
- Badge scanning (RFID)
- Check-in/out detection
- Real-time presence tracking
- Activity history
- Direction detection (IN/OUT)
- WebSocket real-time updates

### When to Create Docs Here

**Create check-in docs when:**
- Implementing badge scanning features
- Documenting check-in API endpoints
- Explaining direction detection logic
- Writing real-time update guides
- Recording check-in decisions

**File naming:**
- `explanation-checkin-[topic].md`
- `reference-checkin-[subject].md`
- `howto-[checkin-task].md`

---

## Check-in System Overview

### Core Flow

```
Badge Scan → Validate Badge → Determine Direction → Create Check-in → Broadcast Update
```

**1. Badge Scan**
- RFID reader captures badge serial number
- Sent to API via kiosk (using API key)

**2. Validate Badge**
- Check badge exists and is active
- Verify assigned to member
- Confirm member is active

**3. Determine Direction**
- IN: Badge not currently "in" → Create IN check-in
- OUT: Badge currently "in" → Create OUT check-in
- Logic: Look at last check-in for this badge

**4. Create Check-in**
- Record: badge, member, timestamp, direction, location
- Atomic transaction

**5. Broadcast Update**
- WebSocket event to all connected clients
- Real-time dashboard updates

---

## Key Features

**Direction Detection:**
- Automatic IN/OUT based on last check-in
- Handles missed scans gracefully
- Manual override capability

**Real-time Updates:**
- WebSocket broadcasting
- Activity backfill on connect
- Presence count tracking

**Historical Data:**
- Full audit trail
- Attendance reports
- Member activity patterns

---

## Code Locations

**Repositories:**
- [apps/backend/src/repositories/checkin-repository.ts](../../../apps/backend/src/repositories/checkin-repository.ts)
- [apps/backend/src/repositories/badge-repository.ts](../../../apps/backend/src/repositories/badge-repository.ts)

**Services:**
- [apps/backend/src/services/checkin-service.ts](../../../apps/backend/src/services/checkin-service.ts) - Direction detection logic
- [apps/backend/src/services/presence-service.ts](../../../apps/backend/src/services/presence-service.ts) - Real-time tracking

**Routes:**
- [apps/backend/src/routes/checkins.ts](../../../apps/backend/src/routes/checkins.ts)

**WebSocket:**
- [apps/backend/src/websocket/checkin-handler.ts](../../../apps/backend/src/websocket/checkin-handler.ts) - Real-time broadcasts

**Schema:**
- [packages/database/prisma/schema.prisma](../../../packages/database/prisma/schema.prisma) - Checkin model

---

## Document Examples

### Explanation Docs
- `explanation-direction-detection.md` - How IN/OUT logic works
- `explanation-realtime-updates.md` - WebSocket architecture
- `explanation-presence-tracking.md` - Current activity calculation

### Reference Docs
- `reference-checkin-api.md` - Check-in endpoints
- `reference-websocket-events.md` - Real-time event specs
- `reference-badge-status.md` - Badge states

### How-to Docs
- `howto-process-badge-scan.md` - Handle badge scan from kiosk
- `howto-manual-checkin.md` - Create manual check-in
- `howto-fix-missed-scan.md` - Correct direction errors
- `howto-subscribe-realtime.md` - WebSocket client setup

---

## Testing Requirements

**Checkin repository:**
- ✅ Create check-in with badge and member
- ✅ Get last check-in for badge
- ✅ Get member activity for date range
- ✅ Presence count queries

**Checkin service:**
- ✅ First scan → IN direction
- ✅ Second scan → OUT direction
- ✅ Third scan → IN again
- ✅ Invalid badge → Error
- ✅ Inactive member → Error
- ✅ Transaction rollback on error

**WebSocket:**
- ✅ Broadcast on check-in
- ✅ Client receives event
- ✅ Activity backfill on connect
- ✅ Auth required for connection

---

## Related Documentation

**Related domains:**
- [Personnel Domain](../personnel/CLAUDE.md) - Members and badges
- [Events Domain](../events/CLAUDE.md) - Event-specific check-ins

**Cross-cutting:**
- [Real-time Systems](../../cross-cutting/monitoring/CLAUDE.md) - WebSocket patterns

**Implementation:**
- [Backend Rebuild Plan](../../plans/active/backend-rebuild-plan.md) - Phase 3.2

---

**Last Updated:** 2026-01-19
