---

description: "Task list template for feature implementation"
---

# Tasks: Convert Azure Function to REST API

**Input**: Design documents from `/specs/001-enable-rest-api/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Unit tests for services and integration tests for controllers are MANDATORY when a story
touches business logic or HTTP contracts. Add additional tests only if explicitly requested.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/src/`, `frontend/src/`
- **Mobile**: `api/src/`, `ios/src/` or `android/src/`
- Paths shown below assume single project - adjust based on plan.md structure

<!-- 
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.
  
  The /speckit.tasks command MUST replace these with actual tasks based on:
  - User stories from spec.md (with their priorities P1, P2, P3...)
  - Feature requirements from plan.md
  - Entities from data-model.md
  - Endpoints from contracts/
  
  Tasks MUST be organized by user story so each story can be:
  - Implemented independently
  - Tested independently
  - Delivered as an MVP increment
  
  DO NOT keep these sample tasks in the generated tasks.md file.
  ============================================================================
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Scaffold ASP.NET Core Web API project in `api/CompoundInterestCalculator.Api.csproj`
- [x] T002 Add `api/CompoundInterestCalculator.Api.csproj` to `CompoundInterestCalculator.sln` and reference `CompoundCalc/CompoundCalc.csproj`
- [x] T003 Create controller, model, mapper, and middleware folders in `api/`
- [x] T004 Update `CompoundInterestCalculatorTests/CompoundInterestCalculatorTests.csproj` to reference `api/CompoundInterestCalculator.Api.csproj` for integration testing

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Introduce `CompoundCalc/Services/Contracts/ICalculationService.cs` and implement via `CalculationService.cs`
- [x] T006 Add immutable result model `CompoundCalc/Models/Responses/CalculationResult.cs` with decimal rounding rules
- [x] T007 Update `CompoundCalc/Helpers/Conversions.cs` to use decimal arithmetic with `MidpointRounding.ToEven`
- [x] T008 Configure dependency injection, API versioning, and Application Insights in `api/Program.cs`
- [x] T009 Implement correlation ID middleware skeleton in `api/Middleware/CorrelationIdMiddleware.cs`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Retrieve interest calculations (Priority: P1) 🎯 MVP

**Goal**: Front end retrieves compound interest results through REST controller preserving legacy behavior

**Independent Test**: Issue POST `/api/v1/calculations` with valid payload and verify response body matches expected totals and metadata

### Tests for User Story 1 ⚠️

- [x] T010 [P] [US1] Add calculation parity unit tests in `CompoundInterestCalculatorTests/Services/CalculationServiceTests.cs`
- [x] T011 [P] [US1] Add happy-path integration test for `POST /api/v1/calculations` in `CompoundInterestCalculatorTests/Integration/CalculationsControllerTests.cs`

### Implementation for User Story 1

- [x] T012 [P] [US1] Create request DTO `api/Models/Requests/CalculationRequestDto.cs`
- [x] T013 [P] [US1] Create response DTO `api/Models/Responses/CalculationResponseDto.cs`
- [x] T014 [US1] Implement mapper `api/Mappers/CalculationMapper.cs` to convert between DTOs and domain models
- [x] T015 [US1] Implement `CalculationsController` with POST action in `api/Controllers/CalculationsController.cs`
- [x] T016 [US1] Register controller route, JSON options, and Swagger doc in `api/Program.cs`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Understand request failures (Priority: P2)

**Goal**: Provide clear validation errors and controller logs explaining why a request failed

**Independent Test**: Submit invalid payload, receive descriptive ProblemDetails response, and locate matching controller log entry containing failure reason and correlation ID

### Tests for User Story 2 ⚠️

- [x] T017 [P] [US2] Add validation failure integration tests in `CompoundInterestCalculatorTests/Integration/CalculationsControllerValidationTests.cs`
- [x] T018 [P] [US2] Add logging assertion tests capturing controller error logs in `CompoundInterestCalculatorTests/Integration/ControllerLoggingTests.cs`

### Implementation for User Story 2

- [x] T019 [P] [US2] Implement FluentValidation rules in `api/Validation/CalculationRequestValidator.cs`
- [x] T020 [US2] Configure automatic validation, ProblemDetails, and error mapping in `api/Program.cs`
- [x] T021 [US2] Implement correlation middleware behavior in `api/Middleware/CorrelationIdMiddleware.cs`
- [x] T022 [US2] Add logging extensions for controller failures in `api/Telemetry/ControllerLoggingExtensions.cs`
- [x] T023 [US2] Update `CalculationsController` to emit structured logs with reasons in `api/Controllers/CalculationsController.cs`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Deploy the service confidently (Priority: P3)

**Goal**: Enable repeatable deployment with readiness checks and documented configuration

**Independent Test**: Execute deployment workflow to new environment, hit readiness endpoint, and confirm logging + configuration succeed without manual intervention

### Tests for User Story 3 ⚠️

- [x] T024 [P] [US3] Add readiness endpoint integration test in `CompoundInterestCalculatorTests/Integration/HealthChecksTests.cs`

### Implementation for User Story 3

- [x] T025 [US3] Configure ASP.NET Core health checks and readiness endpoint in `api/Program.cs`
- [x] T026 [US3] Create GitHub Actions workflow for build/test/deploy in `.github/workflows/api-deploy.yml`
- [x] T027 [US3] Document deployment checklist and environment settings in `docs/deployment.md`
- [x] T028 [US3] Add production configuration template `api/appsettings.Production.json`
- [x] T029 [US3] Update quickstart with deployment verification steps in `specs/001-enable-rest-api/quickstart.md`

**Checkpoint**: All user stories should now be independently functional

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T030 Remove legacy Azure Function entry point in `CompoundCalc/Functions/CompoundCalculator.cs`
- [x] T031 Refine logging configuration and log levels in `api/appsettings.Development.json`
- [x] T032 Update root `README.md` with REST API usage instructions
- [x] T033 Perform final solution formatting and analyzer pass via `dotnet format`
- [x] T034 Review OpenAPI contract alignment with implementation in `specs/001-enable-rest-api/contracts/openapi.yaml`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Depends on US1 controllers and DTOs existing; starts after Phase 3 checkpoint
- **User Story 3 (P3)**: Depends on US1 endpoints and US2 telemetry being available

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (if tests requested):
Task: "Unit tests for calculation service in CompoundInterestCalculatorTests/Services/CalculationServiceTests.cs"
Task: "Integration test for controller endpoint in CompoundInterestCalculatorTests/Integration/CalculationsControllerTests.cs"

# Launch all models for User Story 1 together:
Task: "Define request DTO in api/Models/Requests/CalculationRequestDto.cs"
Task: "Define response DTO in api/Models/Responses/CalculationResponseDto.cs"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
