# Prompt Template (Compact)

Use this template to keep prompts short while still providing enough context.

If this context is your normal workflow, you can keep this single line as a standing default:

`Use docs/agent-docs as baseline context and proceed unless critical details are missing.`

```text
Task:
- <feature/fix/refactor objective>

Use project context from:
- docs/agent-docs/product-and-scope.md
- docs/agent-docs/architecture-principles.md
- docs/agent-docs/api-contract-guidelines.md
- docs/agent-docs/git-operations.md

Constraints:
- Keep changes backward compatible unless noted.
- Keep implementation aligned with deterministic financial calculations.
- Add/update tests for behavior changes.
- Use Conventional Commits for all commit messages.

Deliverables:
- Code changes
- Tests
- Brief summary of contract/behavior impacts
```

## Optional Task-Specific Additions
- Acceptance criteria bullets
- Explicit non-goals
- Performance or observability notes
