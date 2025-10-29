# Feature Specification: REST Backend Service Transformation

**Feature Branch**: `001-enable-rest-api`  
**Created**: 2025-10-28  
**Status**: Draft  
**Input**: User description: "I want the API to be easily deployable and easily consumable from a front end. I want it to follow REST principles. This will be the backend service for a front end. I want easily identifiable logs from the controller layer that explains why an incoming request went wrong."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Retrieve interest calculations (Priority: P1)

A borrower-facing web application requests a compound interest calculation from the backend API and receives the result in a predictable REST format.

**Why this priority**: Front-end usability depends on this flow; without it the product delivers no value.

**Independent Test**: Submit a calculation request with valid inputs to the API endpoint and verify the response body contains the expected totals plus supporting metadata.

**Acceptance Scenarios**:

1. **Given** the front end supplies principal, rate, compounding cadence, and duration, **When** it submits a calculation request, **Then** the API responds with 200-level status containing the ending balance, inputs echoed for confirmation, and a response identifier.
2. **Given** the front end uses the documented REST resource path, **When** it repeats the same valid request, **Then** the API returns an identical response payload proving idempotent behavior.

---

### User Story 2 - Understand request failures (Priority: P2)

A front-end developer needs clear feedback when the API rejects a request so they can correct the client-side logic quickly.

**Why this priority**: Fast debugging avoids user-facing downtime and aligns with the requirement for identifiable controller logs.

**Independent Test**: Submit malformed or out-of-range inputs and confirm the API returns a structured error response while the log stream highlights the controller-level reason.

**Acceptance Scenarios**:

1. **Given** the request omits a required field, **When** the API validates the payload, **Then** it responds with a descriptive 400-level message naming the missing field and includes a correlation token.
2. **Given** the API rejects a request, **When** operations review controller logs for that correlation token, **Then** they see a single entry that explains the validation failure in plain language.

---

### User Story 3 - Deploy the service confidently (Priority: P3)

An operations engineer prepares a new environment and deploys the API with minimal manual steps while ensuring configuration for logging and versioned REST endpoints.

**Why this priority**: Easy deployment ensures the backend can support multiple environments and future front-end releases.

**Independent Test**: Follow the deployment checklist to provision a new environment, deploy the API, and verify readiness checks succeed without custom coding.

**Acceptance Scenarios**:

1. **Given** a clean target environment, **When** the engineer follows the documented deployment steps, **Then** the API is reachable at the expected base URL with the versioned route available.
2. **Given** the service is deployed, **When** a health check request runs, **Then** the API reports a healthy state and logs deployment metadata for traceability.

---

### Edge Cases

- Requests that exceed supported principal, rate, or duration limits.
- Multiple calculation requests arriving concurrently with the same correlation token.
- Upstream dependencies (e.g., configuration store) temporarily unavailable during deployment.
- Front end using an unrecognized API version or Accept header.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The API MUST expose versioned REST endpoints with standard verbs (GET/POST) and predictable resource paths for compound interest calculations.
- **FR-002**: The API MUST return human-readable error bodies that state the reason for rejection and include a correlation token for every 4xx or 5xx response.
- **FR-003**: Controller-layer logs MUST capture request identifiers, triggering endpoint, validation outcome, and a plain-language explanation for failures.
- **FR-004**: The service MUST provide documented deployment steps that can be executed end-to-end within a single working session without custom scripting.
- **FR-005**: The API MUST support environment-specific configuration for base URLs, logging sinks, and feature flags through declarative settings.
- **FR-006**: Successful responses MUST include the computed totals, input echo, and metadata indicating calculation rules and version.
- **FR-007**: The API MUST expose a readiness or health endpoint that confirms configuration, logging, and routing are active post-deployment.
- **FR-008**: The system MUST log deployment events and first-run checks so operations can audit when new versions go live.

### Key Entities *(include if feature involves data)*

- **CalculationRequest Resource**: Represents the inputs required for compound interest (principal, annual rate, compounding cadence, duration) plus optional client metadata.
- **CalculationResult Resource**: Represents the computed totals, echo of supplied inputs, calculation method version, response identifier, and trace token.
- **ControllerLog Entry**: Captures correlation token, timestamp, route, validation outcome, and human-readable reason whenever a request fails or triggers a warning.

## Success Criteria *(mandatory)*

- **SC-001**: Front-end teams successfully retrieve calculation results with correct totals in at least 10 consecutive test runs using the documented REST endpoints.
- **SC-002**: 100% of validation failures produce error responses and controller log entries that contain the same correlation token and plain-language explanations verified by QA.
- **SC-003**: A new environment can be deployed from scratch to a usable API instance following the documented steps in under 60 minutes.
- **SC-004**: Health and readiness checks report operational status without manual reconfiguration across at least two target environments (e.g., staging and production).

## Assumptions & Dependencies

- Front-end applications consume JSON-formatted responses and can pass correlation tokens back to support teams.
- Authentication and authorization are handled by an existing platform service and are out of scope for this feature.
- Centralized logging and monitoring infrastructure is already provisioned to ingest the controller log entries and correlation tokens.
- Deployment pipeline tooling (e.g., CI/CD runner) is available to execute the documented steps without custom scripts.
