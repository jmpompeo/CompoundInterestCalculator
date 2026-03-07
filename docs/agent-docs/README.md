# Agent Docs (High-Level Context)

This folder captures stable, high-level project context for coding agents.

## Goals
- Reduce prompt size by centralizing reusable context.
- Keep guidance durable so docs rarely need updates.
- Avoid implementation-level details that drift quickly.

## Suggested Usage in Prompts
- Link to these docs first.
- Add only task-specific requirements in the prompt.
- Avoid repeating project background unless needed.

### Do I have to ask for these docs explicitly every time?
No. You can set this as your **default prompt convention** and only override it when a task needs extra context.

Recommended one-liner to reuse:

`Use docs/agent-docs as baseline context; only ask follow-ups if details are missing.`

## Document Index
- `product-and-scope.md`: what the system does and does not do.
- `architecture-principles.md`: high-level design constraints and priorities.
- `api-contract-guidelines.md`: contract and behavior expectations without endpoint-by-endpoint implementation detail.
- `prompt-template.md`: compact prompt scaffold for feature/fix tasks.
- `git-operations.md`: default branch + commit workflow conventions.

## Maintenance Rule
Prefer updating these docs only when project direction or non-functional constraints change.
