# Enhanced Reports - Investigation Notes

## 2024-12-04 - Initial Requirements Gathering

### Context Discovery

**Current State**:
- `frontend/src/pages/Reports.tsx` has three tabs: Current Presence, Attendance History (placeholder), Visitor History
- CSV export implemented for Presence and Visitor History
- Uses HeroUI components, date-fns for formatting
- DateRangePicker already in use for visitor history filtering

**Existing Data**:
- Members have: serviceNumber, firstName, lastName, rank, division, classification
- Check-ins tracked with timestamp
- Visitors tracked with: name, organization, visitType, purpose, host, checkIn/Out times

### Domain Knowledge Captured

**Training Year**: September 1 - May 31
- Not calendar year
- Holiday exclusions (Christmas leave, etc.) need to be configurable

**Weekly Schedule**:
- Training Nights: Tuesday, 19:00-22:10 (mandatory for most members)
- Admin Nights: Thursday, 19:00-22:10 (FT staff + upper management, not strictly tracked)
- Weekday hours: Mon/Wed/Fri 08:00-16:00 for Full-Time Staff

**Summer Hours**:
- Different schedule (example: 09:00-15:00)
- Configurable start/end dates

**Member Classifications**:
1. Full-Time Staff (Class B/C) - daily attendance
2. Reserve Members (Class A) - training night attendance
3. BMQ Students - both BMQ sessions AND regular training nights

**BMQ Courses**:
- Basic Military Qualification for new members
- Variable timing (could be Fall, Winter, multiple per year)
- Runs on different days than regular training (often weekends)
- Students tracked separately for BMQ attendance

### Key Decisions Made

1. **PDF Library**: `@react-pdf/renderer` - declarative React components, good for structured documents
2. **Architecture**: Hybrid - frontend for on-demand, backend for scheduled/email
3. **Email Service**: Resend (to be added) - modern API, good DX
4. **Scheduling**: BullMQ - already have Redis
5. **Training Year**: Admin-configurable via Settings page
6. **Absence Reasons**: NOT tracked in Sentinel (tracked on DWAN separately)
7. **FT Staff Shifts**: Just track presence, no shift matching
8. **Admin Nights**: Informational only, not tracked with reports
9. **Report Settings**: Highly configurable - admin can adjust thresholds, formatting, etc.

### Report Organization Options

For Training Night and BMQ reports:
- Full Unit Report
- Grouped by Division
- Separated by Division (page breaks or separate PDFs)
- Specific Division only
- Specific Member only

### Special Handling Requirements

**New Members**:
- Grace period (configurable, default 4 weeks)
- Show "New" badge instead of potentially misleading low %

**Minimum Data**:
- Need X training nights (configurable, default 3) to show percentage
- Otherwise show "X of Y" format

**Thresholds**:
- Warning (yellow): Below 75% (configurable)
- Critical (red): Below 50% (configurable)
- BMQ can have separate thresholds

**Trends**:
- Compare current vs previous period
- Show up/down/stable arrows

### Resolved Items

- [x] **Letterhead assets**: Unit crest at `/home/sauk/projects/images/hmcs_chippawa_crest.jpg` (naval badge with anchor and wheat sheaf)
- [x] **Unit details**: HMCS CHIPPAWA, 1 Navy Way, Winnipeg MB
- [x] **Audit logging**: Yes - track who generates reports, when, with what parameters
- [ ] **Email domain**: Deferred to Phase 3 - will need verified domain with SPF/DKIM records

---

## Technical Notes

### Attendance Calculation Edge Cases

1. Member joins mid-training-year: Calculate from enrollment date
2. Member on BMQ: Track BMQ and training night separately
3. Holiday week: Exclude from "possible" count
4. Member transfers divisions: Historical attendance stays with member

### PDF Generation Considerations

- Large reports (500+ rows) need pagination
- Consider web worker for UI responsiveness
- SVG charts supported natively by react-pdf
- Font loading: Include Inter in PDF bundle
