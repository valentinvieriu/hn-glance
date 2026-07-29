# HN Glance Ticket Relationships

Use GitHub-native relationships when ordering or hierarchy is real.

## Parent and Sub-issues

- An Epic is the parent.
- Independently deliverable implementation tickets are children.
- Do not use an Epic as one large implementation checklist.
- Create multiple child issues only when the user explicitly authorizes the
  complete decomposition.

In an adapter plan, put the parent issue number or URL in
`relationships.parent`. To attach existing children to an Epic, use the
first-class `gh issue edit --add-sub-issue` operation after authorization.

## Blocking

The blocked issue points to the issue preventing it.

- `blockedBy`: issues that must progress before this issue can.
- `blocking`: issues that this issue prevents from progressing.
- Do not encode a hard dependency only as body text.
- Use a normal issue link for related context that imposes no ordering.

The adapter uses first-class `gh issue edit --add-blocked-by` and
`--add-blocking` operations and verifies the direction through structured issue
output.
