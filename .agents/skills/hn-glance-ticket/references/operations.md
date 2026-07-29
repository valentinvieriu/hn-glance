# Operations Ticket

Use for deployment, Cloudflare configuration, capacity, cost, security,
observability, or production runbook work.

```markdown
### Objective

<Operational outcome or risk reduction.>

### Current State

<Relevant infrastructure, limits, symptoms, or contract.>

### Proposed Change

<Affected Workers, R2, Queue, cache, secrets, CI, or operational process.>

### Risk and Rollback

- Risk: <failure mode>
- Detection: <signal or diagnostic>
- Rollback: <safe reversal or containment>

### Acceptance Criteria

- [ ] <Configuration or runtime outcome>
- [ ] Cost, capacity, retention, and cache implications remain within documented limits.
- [ ] Required secrets and stable `HN_GLANCE_*` / `X-HN-*` contracts are preserved.

### Validation

<Relevant bootstrap, build, type generation, Wrangler dry run, scheduler dry run, or production diagnostic.>

### Documentation

<Required README, AGENTS, or runbook updates.>
```

Use only checks relevant to the change. Do not increase screenshot admissions,
R2 storage, retention, dimensions, quality, or byte limits without
recalculating the documented cost envelope.
