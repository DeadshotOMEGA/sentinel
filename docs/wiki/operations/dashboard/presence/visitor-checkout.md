# Presence: Visitor Checkout

![Visitor card with checkout action](/uploads/wiki-dashboard/operations/dashboard-visitor-card-checkout.png)

Visitor checkout signs a visitor out of the building.

## What This Is

Visitor checkout signs a visitor out of the building.

## When To Use It

Use it when a visitor is actually leaving or a visit needs authorized correction.

## What To Check

- Visitor identity.
- Host or visit details.
- Whether the visitor is physically leaving.
- Visitor count after checkout.

## Lockup Stop Condition

If a visitor remains checked in at lockup, stop and resolve that visitor before executing lockup. Confirm whether the visitor is still physically present, already left without checkout, or was entered under the wrong record.

## Step-by-Step Admin Procedure

1. Filter Visitors.
2. Confirm the visitor identity.
3. Confirm the person is leaving.
4. Use Sign Out or checkout action.
5. Recheck the visitor count.

## Good / Caution / Stop Conditions

Good: Visitor is signed out and count updates.

Caution: Visitor details need confirmation with the host.

Stop: Visitor cannot be identified or is not actually leaving.

## What To Confirm After Action

Confirm the visitor no longer appears in active Presence.

## When To Escalate

Escalate if visitor state cannot be verified, if the host cannot confirm departure, or if the visitor is still active when the building is otherwise ready for lockup.

## Related Dashboard Help Pages

- [Overview](/operations/dashboard/overview)
- [Presence Grid](/operations/dashboard/presence-grid)
- [Filters](/operations/dashboard/presence/filters)
- [Search](/operations/dashboard/presence/search)
- [Manual In Out](/operations/dashboard/presence/manual-in-out)
- [Person Cards](/operations/dashboard/presence/person-cards)
- [Member Actions](/operations/dashboard/presence/member-actions)
- [Visitor Checkout](/operations/dashboard/presence/visitor-checkout)
- [Empty States](/operations/dashboard/presence/empty-states)
