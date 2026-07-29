# Technical Debt Ticket

Use for internal quality, maintainability, or dependency work that preserves
intended user-visible behavior.

```markdown
### Current State

<What is difficult, fragile, duplicated, obsolete, or costly?>

### Why It Matters

<Concrete maintenance, reliability, performance, security, or delivery impact.>

### Proposed Direction

<Preferred change and why it is proportionate.>

### Scope

- <In-scope code or contract>

### Non-goals

- <Behavior or broader migration that must not be pulled in>

### Acceptance Criteria

- [ ] <Internal outcome that can be verified>
- [ ] Existing user-visible behavior and infrastructure contracts are preserved.

### Validation

<Tests, build checks, comparison evidence, or rollback safety.>

### Alternatives Considered

<Optional; include only when the trade-off is not obvious.>
```

Do not use technical debt as permission for a broad migration, unrelated
refactor, dependency churn, or repository-wide reformat.
