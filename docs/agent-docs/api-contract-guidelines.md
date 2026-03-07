# API Contract Guidelines

## Contract Expectations
- Treat request/response DTOs as public contracts.
- Prefer explicit fields and clear units/semantics.
- Ensure validation rules are predictable and explainable.

## Compatibility Approach
- Default to non-breaking evolution.
- If a breaking change is unavoidable, document impact and migration path.

## Error and Validation Philosophy
- Return structured, actionable validation feedback.
- Keep error semantics consistent across endpoints.
- Avoid ambiguous behavior for edge-case input.

## Numeric Behavior
- Prioritize deterministic decimal calculations.
- Be explicit about rounding strategy at boundaries.
- Ensure tests cover representative financial edge cases.
