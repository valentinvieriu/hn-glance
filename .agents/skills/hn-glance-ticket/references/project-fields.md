# HN Glance Project Fields

Use this taxonomy for the private `HN Glance` GitHub Project attached to
`valentinvieriu/hn-glance`. The structured IDs consumed by the adapter live in
`project-config.json`; never copy or guess opaque IDs in ticket prose.

## Board

| Setting | Value |
|---|---|
| Owner | `valentinvieriu` |
| Repository | `valentinvieriu/hn-glance` |
| Project | `HN Glance` |
| Project number | `3` |
| URL | `https://github.com/users/valentinvieriu/projects/3` |
| Visibility | Private |

Every created ticket belongs on this project and starts in `Inbox`.

## Field Design

The board deliberately uses only fields that change a triage or delivery
decision:

- `Status`: where the work is in the delivery flow.
- `Type`: what kind of outcome the ticket represents.
- `Area`: the primary HN Glance subsystem.
- `Priority`: impact and urgency.
- `Effort`: rough complexity and coordination.

Use milestones only for real releases or time-bound goals. Do not add dates,
sprints, confidence, source, or duplicate metadata fields without a repeated
decision that the existing model cannot support.

## Status

| Value | Meaning | Entry rule |
|---|---|---|
| Inbox | Captured but not yet refined or ordered | Default for every new ticket |
| Ready | Clear, scoped, testable, and unblocked | Definition of Ready is met |
| In Progress | Active implementation or investigation | Someone is working on it |
| In Review | Awaiting review or final verification | Usually has a PR or handoff |
| Blocked | Cannot progress because of a named dependency | Link the blocker natively |
| Done | Accepted and complete | Acceptance and required validation are complete |

Normal flow:

```text
Inbox -> Ready -> In Progress -> In Review -> Done
```

`Blocked` is an exception state. Return to the appropriate normal state after
the blocker clears. Closing an issue and setting `Done` are separate actions.

## Type

Choose exactly one:

| Value | Use for |
|---|---|
| Feature | New or intentionally changed user-visible behavior |
| Bug | Incorrect behavior, regression, or production defect |
| Technical debt | Internal quality work that preserves intended behavior |
| Operations | Deployment, Cloudflare, cost, capacity, security, or observability |
| Research | A bounded investigation ending in evidence or a decision |
| Documentation | A documentation-only outcome |
| Epic | One coherent outcome requiring multiple child tickets |

Do not duplicate `Type` as a label. Use native parent/sub-issue relationships
for Epics.

## Area

Choose the primary area. Mention secondary areas in the body.

| Value | Includes |
|---|---|
| Discovery feeds | Top, Best, New, Show, ordering, caching, grids, and cards |
| Story page | Item details, related stories, source navigation, and metadata |
| Comments | Sanitization, rich text, nesting, collapsing, and references |
| User activity | Profiles and paginated story/comment activity |
| Screenshot pipeline | Public API, R2, source policy, scheduler, Queue, and capture agent |
| Shared UI | Header/footer, themes, responsive layout, and accessibility |
| Platform | Nuxt/Nitro, Cloudflare deployment, caching, security, and operations |
| Developer experience | Tests, tooling, dependencies, CI, automation, and contributor docs |

## Priority

Priority reflects impact and urgency; effort must not influence it.

| Value | Meaning |
|---|---|
| P0 | Active security incident, data-loss risk, or production outage |
| P1 | Serious regression or high-impact problem that should be handled next |
| P2 | Normal planned work; default when no stronger case exists |
| P3 | Useful polish, optimization, or cleanup with low current impact |

Require a concrete impact statement for `P0` or `P1`. Never invent one.

## Effort

Effort is a rough complexity signal, not a time estimate.

| Value | Guideline |
|---|---|
| XS | Localized and mechanically clear |
| S | Focused change with a small verification surface |
| M | Several files or one meaningful cross-layer change |
| L | Cross-system work, migration, or substantial operational risk |
| XL | Too large or uncertain for one implementation ticket |

Split an `XL` implementation outcome or use an Epic or time-boxed Research
ticket. Epic effort may be `XL`; implementation children should normally be
`L` or smaller.

## Lifecycle Safety

- Move `Inbox` to `Ready` only when the Definition of Ready is met.
- Use `Blocked` only for a named, current blocker.
- Move to `Done` only after acceptance and required validation.
- Keep native issue state and project status distinct.
- Refresh `project-config.json` after a deliberate project schema change.
- Do not change single-select options casually: replacing an option list can
  recreate IDs and clear values on existing items.
