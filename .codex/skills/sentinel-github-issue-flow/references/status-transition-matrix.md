# Status Transition Matrix

## triage

- Set label: `status:triage`
- Remove other status labels.
- Require one type label (`type:bug|type:feature|type:task|type:refactor`).
- Project status: `🧪 Inbox`

## planned

- Set label: `status:planned`
- Remove other status labels.
- Require milestone/release pair (or existing milestone that can be aligned).
- Project status: `📌 Planned`

## working

- Set label: `status:working`
- Remove other status labels.
- Run working-load check and warn if another issue is already working.
- Project status: `⚙️ Working`

## testing

- Set label: `status:testing`
- Remove other status labels.
- Keep milestone/release aligned for follow-up fixes in same release cycle.
- Project status: `🧪 Testing`

## blocked

- Set label: `status:blocked`
- Remove other status labels.
- Require blocker note.
- Require exactly one blocked reason label: `blocked:external|blocked:dependency|blocked:decision`.
- Project status: `🚧 Blocked`

## done

- Remove all status labels.
- Project status: `✅ Done`
- Suggest closing issue after acceptance is met.
