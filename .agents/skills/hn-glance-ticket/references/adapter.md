# HN Glance Ticket Adapter

Use `scripts/hn_ticket.py` for new-issue mutations and authorized title/body
refinements. Resolve `<skill-dir>` to the directory containing the skill's
`SKILL.md`.

## Interface

Ask the adapter for the current plan contract instead of copying it from
memory:

```bash
python3 <skill-dir>/scripts/hn_ticket.py schema
```

Write the complete issue body to a temporary Markdown file. Write a JSON plan
that satisfies the returned schema and points `bodyFile` to that absolute path.

`impact` is required only for P0/P1. Relationship values accept positive issue
numbers or full GitHub issue URLs:

- `parent`: the Epic that owns the new issue;
- `blockedBy`: issues preventing the new issue; and
- `blocking`: issues prevented by the new issue.

## Safe Creation

Run in this order:

```bash
python3 <skill-dir>/scripts/hn_ticket.py validate --plan <plan.json>
python3 <skill-dir>/scripts/hn_ticket.py duplicates --plan <plan.json>
python3 <skill-dir>/scripts/hn_ticket.py doctor
python3 <skill-dir>/scripts/hn_ticket.py create --plan <plan.json>
```

Review duplicate candidates by intended outcome, affected surface,
constraints, and verification—not title similarity alone. Classify the result
as duplicate, overlapping, related, or distinct. Stop before creation for a
duplicate; show an overlapping candidate before proceeding.

The adapter re-runs its health check before mutation. It creates the issue once,
adds it to project 3, sets Status, Type, Area, Priority, and Effort, applies
native relationships, and verifies the issue and project item.

## Safe Refinement

For an existing issue, use an `operation: "refine"` plan and add an `updates`
array containing only the fields the user authorized: `body`, `title`, or both.
Set `projectStatus` to the issue's expected current project status. All other
plan values describe the state that must remain true after the edit.

Run:

```bash
python3 <skill-dir>/scripts/hn_ticket.py validate --plan <plan.json>
python3 <skill-dir>/scripts/hn_ticket.py doctor
python3 <skill-dir>/scripts/hn_ticket.py refine \
  --plan <plan.json> \
  --issue-url <issue-url>
```

The adapter edits only the fields named in `updates`, then verifies the title,
body, labels, assignees, milestone when specified, relationships when
specified, project membership, and all five project fields. Use the receipt to
report completed edits and any mismatches. Use first-class `gh issue edit` or
`gh project item-edit` directly only for narrowly scoped existing-issue
metadata the adapter does not support.

## Partial Failure

A `partial` receipt means the issue exists but an edit, configuration step, or
verification did not complete. Do not create another issue. Resume new-issue
configuration safely:

```bash
python3 <skill-dir>/scripts/hn_ticket.py configure \
  --plan <plan.json> \
  --issue-url <issue-url>
```

Verify independently when needed:

```bash
python3 <skill-dir>/scripts/hn_ticket.py verify \
  --plan <plan.json> \
  --issue-url <issue-url>
```

Report the issue URL, completed steps, exact errors, and remaining work from the
JSON receipt.
