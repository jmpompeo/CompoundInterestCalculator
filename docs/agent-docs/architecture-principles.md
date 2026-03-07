# Architecture Principles

## System Shape
- API-first service with stateless request processing.
- Separation of concerns between transport, validation, mapping, and calculation logic.

## Design Priorities
1. Correctness and deterministic calculations.
2. Contract consistency and explicit validation behavior.
3. Operational readiness (health checks, telemetry, deploy compatibility).
4. Readability and maintainability over cleverness.

## Change Guidance
- Favor additive, backward-compatible changes to request/response contracts.
- Keep business math isolated from HTTP/controller concerns.
- Use structured logging and correlation-friendly telemetry patterns.
- Preserve consistent naming and response semantics across endpoints.

## Anti-Goals
- Embedding transport concerns deep in domain logic.
- Introducing hidden state or non-deterministic calculation paths.
- Expanding scope into persistence unless explicitly required.
