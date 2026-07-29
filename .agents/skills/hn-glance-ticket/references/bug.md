# Bug Ticket

Use for incorrect behavior, regressions, or production defects. Lead with the
observed symptom and impact; keep an unverified root-cause theory identified as
a hypothesis.

Suggested existing label: `bug`.

```markdown
### Summary

<Incorrect behavior and its impact.>

### Steps to Reproduce

1. <Starting state, route, story ID, or environment>
2. <Action>
3. <Observed failure>

### Expected Behavior

<What should happen?>

### Actual Behavior

<What happens instead?>

### Evidence

<Optional screenshot, sanitized log, response headers, request ID, or reproduction.>

### Environment

- App surface: <production / local / both>
- Route or API: <path>
- Browser/device: <when relevant>
- First known occurrence: <when known>

### Acceptance Criteria

- [ ] The reproduction no longer fails.
- [ ] A regression check covers the failure at the appropriate layer.
- [ ] Neighboring behavior and failure states remain correct.

### Validation

<Exact automated and manual verification.>
```

For screenshot bugs, include the HN story ID and available diagnostic headers:
`CF-Cache-Status`, `X-HN-Screenshot-Cache`, and
`X-HN-Screenshot-Source-Route`. Do not include private targets, credentials, or
unredacted sensitive logs.
