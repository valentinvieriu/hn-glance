# HN Glance Ticket Conventions

Apply these conventions to every ticket. Keep the resulting issue compact:
remove empty optional sections and all placeholder text.

## Ticket Quality

- Use a concise, imperative or outcome-oriented title.
- Prefix it with exactly one of `[Feature]`, `[Bug]`, `[Tech Debt]`, `[Ops]`,
  `[Research]`, `[Docs]`, or `[Epic]`.
- Use `###` headings in the issue body.
- State outcomes and observable acceptance criteria rather than disguising
  implementation tasks as requirements.
- Keep implementation choices open unless evidence or a repository contract
  constrains them.
- Separate known facts from assumptions and unverified root-cause theories.
- Include an `Assumptions and Open Questions` section only when it changes how
  the work should be understood or implemented.
- Keep `Type`, `Area`, `Priority`, `Effort`, and `Status` on the project board,
  not in a body metadata table.
- Link concrete evidence when available.
- Apply a label only when it already exists. The project `Type` field remains
  authoritative.

Title prefixes are retained because HN Glance does not currently use native
GitHub Issue Types as its authoritative taxonomy and project fields are not
visible in every issue-list context.

## Definition of Ready

A non-Epic ticket may move to `Ready` when:

- the outcome is understandable without private context;
- acceptance criteria are testable;
- primary Area, Priority, and Effort are set;
- known hard dependencies are linked natively;
- material product, architecture, cost, security, or migration constraints are
  stated; and
- the work is implementable as one ticket, or is explicitly Research.

## Quality Lenses

Before finalizing, consider only the lenses materially affected:

- security, privacy, or sensitive data;
- accessibility, responsive behavior, or interaction states;
- performance, caching, capacity, retention, or cost;
- failure behavior, retries, recovery, or rollback;
- compatibility or migration;
- observability and diagnostics; and
- cleanup or lifecycle behavior.

Do not add empty boilerplate sections for unaffected lenses.

## Definition of Done

Tailor the checklist. Keep only relevant items:

```markdown
### Definition of Done

- [ ] Acceptance criteria are met.
- [ ] Tests are added or updated in proportion to the change.
- [ ] `npm run check` passes, or any exception is recorded with evidence.
- [ ] User-facing UI changes are verified at relevant responsive sizes.
- [ ] Screenshot-first browsing and source-link behavior remain intact where affected.
- [ ] Deployment, Cloudflare, or screenshot-pipeline changes pass relevant dry runs.
- [ ] `README.md` and `AGENTS.md` are updated when contracts or architecture change.
```

## HN Glance Product Constraints

- Preserve the `scan -> compare -> open or move on` discovery loop.
- Treat screenshots as the primary evaluation surface, not decoration.
- Keep the source/domain link as the external action and the card/title as the
  HN Glance story action.
- Keep HN metadata useful but subordinate to visual article context.
- Preserve nested comment meaning and readability.
- Respect the current Cloudflare and screenshot-pipeline contracts in
  `AGENTS.md`; do not turn a ticket into permission to bypass them.
