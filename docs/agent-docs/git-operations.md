# Git Operations Guide

Use this as the default workflow for repository hygiene and predictable history.

## Default Branching Workflow

1. Start from the local `main` branch.
2. Sync it with the remote using rebase:

   ```bash
   git checkout main
   git pull --rebase origin main
   ```

3. Create a new topic branch from updated `main`:

   ```bash
   git checkout -b <type>/<short-description>
   ```

## Commit Message Standard

All commits should use **Conventional Commit** format for the subject line:

```text
<type>(optional-scope): <short summary>
```

Every commit should also include a brief body (1-3 bullets or short lines) describing
what changed and why. Keep it concise, but specific enough that someone can understand
the intent without opening the diff immediately.

Suggested `git commit` usage:

```bash
git commit -m "feat(api): add debt payoff totals" \
  -m "- include total interest + payoff month in response
- keep contract backward compatible"
```

Examples:

- `feat(api): add debt payoff scenario metadata`
- `fix(web): correct budget total rounding`
- `docs(agent-docs): add git operations defaults`
- `test(api): cover mortgage validation edge cases`

## Recommended Types

- `feat`: new functionality
- `fix`: bug fix
- `docs`: documentation-only updates
- `refactor`: code restructuring without behavior change
- `test`: tests added/updated
- `chore`: tooling, dependency, or maintenance changes

## Practical Rules

- Keep commits focused and scoped to a single intent.
- Include a concise commit body for context, not just a one-line subject.
- Prefer multiple small conventional commits over one mixed commit.
- Rebase your feature branch on `main` before opening or updating a PR when needed.
