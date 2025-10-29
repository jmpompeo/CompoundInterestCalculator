# Implementation Plan: Convert Azure Function to REST API

**Branch**: `001-enable-rest-api` | **Date**: 2025-10-28 | **Spec**: `../spec.md`
**Input**: Feature specification from `/specs/001-enable-rest-api/spec.md`
**Note**: This template is filled in by the `/speckit.plan` command and must satisfy the Constitution gates defined in `api/.specify/memory/constitution.md`.

## Summary

Rewrite the existing compound interest Azure Function into an ASP.NET Core controller-based REST API
that preserves calculation behavior, introduces predictable REST contracts, and provides deployment
and observability improvements demanded in the specification.

## Technical Context

**Language/Version**: C# 12 on .NET 8 (ASP.NET Core Web API)  
**Primary Dependencies**: ASP.NET Core MVC, Application Insights, Newtonsoft.Json (legacy contract parity)  
**Storage**: N/A (stateless calculations); note any new persistence requirement explicitly  
**Testing**: xUnit with FluentAssertions; integration tests executed via ASP.NET Core test host  
**Target Platform**: Azure App Service or containerized Linux deployment  
**Project Type**: Backend API (`api/` project)  
**Performance Goals**: MUST respond within 200ms p95 for calculation endpoints under typical load  
**Constraints**: Deterministic decimal math; no reliance on Function runtime bindings  
**Scale/Scope**: Single public controller surface focused on compound interest calculations  
**Deployment Strategy**: GitHub Actions pipeline deploying to Azure App Service (Linux)  
**Authentication/Authorization**: Upstream gateway enforces auth; API remains anonymous but emits correlation tokens  
**Configuration Management**: ASP.NET Core `appsettings.{Environment}.json` plus Azure App Service application settings

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Controllers: All HTTP endpoints MUST be implemented as ASP.NET Core controllers.
- Services: Business logic MUST remain in stateless injectable services with accompanying tests.
- Contracts & Validation: DTOs defined per endpoint with validation and typed responses.
- Calculations: Decimal arithmetic with explicit rounding, parity tests against legacy results.
- Telemetry: Structured logging, correlation IDs, and Application Insights instrumentation for every endpoint.

**Assessment**: Pass — Planned controller conversion, stateless service reuse, validated DTOs, parity testing, and telemetry updates align with constitutional requirements. GitHub Actions deployment plus configuration strategy ensure compliance with observability and governance expectations.

## Project Structure

### Documentation (this feature)

```text
specs/001-enable-rest-api/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
api/
├── Controllers/
├── Services/
│   ├── Contracts/
│   └── Implementations/
├── Models/
│   ├── Requests/
│   └── Responses/
├── Mappers/
└── Program.cs

tests/
├── Integration/
└── Unit/
```

**Structure Decision**: Adopt single API project with controllers, services, DTOs, and supporting test projects as outlined above.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *(None yet)* | - | - |

## Phase 0 – Research

### Objectives

- Confirm deployment, authentication, and configuration approaches that satisfy the constitution gates.
- Capture legacy parity expectations for calculations and logging.

### Tasks

1. Document deployment strategy leveraging GitHub Actions to Azure App Service (research.md §Deployment Strategy).
2. Validate assumptions about upstream authentication and correlation tokens (research.md §Authentication & Authorization).
3. Define configuration management approach using `appsettings.{Environment}.json` plus App Service settings (research.md §Configuration Management).

### Deliverables

- `research.md` reflecting all decisions above and closing prior clarifications.

## Phase 1 – Design & Contracts

### Objectives

- Translate functional requirements into data contracts, DTOs, and telemetry expectations.
- Provide concrete API surface definitions and developer onboarding materials.

### Tasks

1. Define domain DTOs, log payloads, and enumerations in `data-model.md`.
2. Produce OpenAPI specification for calculation and readiness endpoints in `contracts/openapi.yaml`.
3. Write `quickstart.md` covering local execution, testing, deployment verification, and observability checks.
4. Update agent context (`AGENTS.md`) so future automation understands stack constraints.

### Constitution Re-check

- Controllers: OpenAPI defines versioned routes (`/api/v1`). ✔️
- Services: Data model enforces stateless service contracts. ✔️
- Contracts & Validation: Field-level validation captured in schema. ✔️
- Calculations: Decimal rounding rules recorded. ✔️
- Telemetry: Log entry schema plus quickstart verification steps. ✔️

## Phase 2 – Implementation Preparation

### Objectives

- Outline upcoming development work that `/speckit.tasks` will later decompose.

### Workstreams

1. **Controller Surface**: Scaffold calculation controller with POST endpoint, readiness endpoint, and API versioning attributes.
2. **Domain Services**: Extract existing calculation logic into injectable service with decimal arithmetic and parity tests.
3. **Validation & Mapping**: Implement FluentValidation or data annotations, build response mapper, ensure problem details responses.
4. **Telemetry & Observability**: Configure structured logging, correlation IDs, Application Insights telemetry, and controller-specific log messages.
5. **Deployment Enablement**: Author GitHub Actions workflow, document environment variables, and provide App Service deployment instructions.

### Entry Criteria for Phase 3 (Tasks)

- Plan, research, API contracts, data model, and quickstart completed (✅).
- No outstanding constitutional gates or clarifications (✅).
