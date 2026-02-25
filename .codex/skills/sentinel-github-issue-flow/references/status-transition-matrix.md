# Status Transition Matrix

## triage

- Set label: `status:triage`
- Remove other status labels.
- Require one type label (`bug|feature|task|refactor`).
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

## blocked

- Set label: `status:blocked`
- Remove other status labels.
- Require blocker note.
- Project status: `🚧 Blocked`

## done

- Remove all status labels.
- Project status: `✅ Done`
- Suggest closing issue after acceptance is met.
