# Kiosk Visitor Sign-In Options (Editable Spec)

This document describes the current kiosk self-service visitor sign-in flow used on `/kiosk`.

## Editing Guide

- Keep existing behavior: write `KEEP`
- Add behavior: write `ADD: ...`
- Change behavior: write `CHANGE: ...`
- Remove behavior: write `REMOVE`
- Unknown decision: write `TBD`

## 1. Screen-Level Baseline

| Screen                       | Who Sees It                                  | Current Inputs / Questions / Details                                              | Required Rules                                     | Requested Updates |
| ---------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------- |
| Step 1: Reason for Visit     | All visitors                                 | Choose one: `Recruitment`, `Contract Work`, `Event`, `Museum`, `Meeting`, `Other` | Reason must be selected before Continue            | KEEP              |
| Step 2: Routing              | Recruitment visitors                         | Informational step only (no extra selection)                                      | Recruitment skips Military/Civilian selection      | KEEP              |
| Step 2: Routing              | Contract Work, Event, Museum, Meeting, Other | Select one: `Military` or `Civilian`                                              | Military/Civilian must be selected before Continue | KEEP              |
| Step 2: Meeting Selection    | Meeting visitors                             | `Select Member` (search + pick)                                                   | Member selection is required for meeting reason    | KEEP              |
| Step 2: Event Selection      | Event visitors                               | `Select Event` (search + pick)                                                    | Event selection is required for event reason       | KEEP              |
| Step 3: Civilian Info Inputs | Civilian paths + Recruitment                 | `First Name`, `Last Name`                                                         | Both required                                      | KEEP              |
| Step 3: Military Info Inputs | Military paths                               | `Rank`, `Last Name`, `Initials`, `Unit`                                           | All required                                       | KEEP              |
| Step 4: Contract Work Inputs | Contract Work reason                         | `Company/Organization Name`, `Work Description`, `License Plate (optional)`       | Company/Organization + work description required   | KEEP              |
| Step 4 or 5: Review          | All visitors                                 | Summary of reason, routing selections, details                                    | User can go back and edit prior steps              | KEEP              |
| Completion Screen            | All visitors                                 | Final title, message, and action label                                            | Existing completion message families retained      | KEEP              |

## 2. Reason Matrix

| Reason        | Step 2 Routing       | Step 3 Inputs                                                   | Required Selection | Payload Mapping                                                                                         |
| ------------- | -------------------- | --------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------- |
| Recruitment   | Skip branch selector | Civilian info inputs                                            | None               | `visitType=recruitment`, `visitPurpose=information`, `recruitmentStep=information`                      |
| Contract Work | Military/Civilian    | Step 3 branch identity inputs, then Step 4 contract work inputs | None               | `visitType=contractor`, `visitPurpose=other`, `organization`, `purposeDetails`, optional `licensePlate` |
| Event         | Military/Civilian    | Branch identity inputs                                          | Event required     | `visitType` from branch, `visitPurpose=information`, `eventId` and event summary                        |
| Museum        | Military/Civilian    | Branch identity inputs                                          | None               | `visitType` from branch, `visitPurpose=information`                                                     |
| Meeting       | Military/Civilian    | Branch identity inputs                                          | Member required    | `visitType` from branch, `visitPurpose=appointment`, required `hostMemberId`                            |
| Other         | Military/Civilian    | Branch identity inputs                                          | None               | `visitType` from branch, `visitPurpose=information`                                                     |

## 3. Branch Identity Rules

| Branch   | Fields                                  | Required | Mapping Notes                                                                   |
| -------- | --------------------------------------- | -------- | ------------------------------------------------------------------------------- |
| Military | `Rank`, `Last Name`, `Initials`, `Unit` | Yes      | Map `firstName=initials`, `lastName=last name`, include `rankPrefix` and `unit` |
| Civilian | `First Name`, `Last Name`               | Yes      | Standard civilian first/last mapping                                            |

## 4. Completion Outcome Variants

| Condition                    | Completion Title                              | Completion Action   | Requested Updates |
| ---------------------------- | --------------------------------------------- | ------------------- | ----------------- |
| `visitType = recruitment`    | Recruitment Check-In Complete                 | Proceed to Brow     | KEEP              |
| `visitType = contractor`     | Contractor Check-In Complete                  | Report to Duty Desk | KEEP              |
| Meeting with selected member | Welcome to the Unit (member named in message) | Report to Duty Desk | KEEP              |
| Information flow (default)   | Welcome to the Unit (information assistance)  | Report to Duty Desk | KEEP              |
| All other cases              | Welcome to the Unit (general processing)      | Report to Duty Desk | KEEP              |
