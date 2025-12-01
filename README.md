# Compound Interest Calculator

This project turns a legacy Azure Function into a full ASP.NET Core web experience for calculating
compound interest. The API guarantees deterministic decimal math, surfaces detailed metadata for
traceability, and ships with a lightweight React UI so people can experiment with cadences, interest
rates, and time horizons without writing code.

## What It Does

- `POST /api/v1/calculations` receives principal, annual rate, cadence, and duration, then returns the
  ending balance along with currency formatting, calculation version, and correlation identifiers.
- FluentValidation enforces business rules (principal, rates, cadence support, request metadata) and
  emits RFC 7807 responses that include the same trace ID seen in logs.
- Structured telemetry logs every request with a propagated `x-correlation-id`, plus dedicated events
  for validation failures and unexpected exceptions.
- The bundled SPA highlights the API output, echoes trace IDs, and walks users through picking a
  compounding schedule so the backend and frontend always stay in sync.

## Tech Highlights

- .NET 8 Web API with API versioning, Swagger UI, and readiness health checks for Render deployments.
- Deterministic decimal math lives in a separate `CompoundCalc` domain assembly that can be reused in
  other workloads or tested in isolation.
- React 18 + Vite + Tailwind provide the UI, while a small Node script copies the build artifacts into
  `wwwroot` so ASP.NET Core serves the same bundle in development and production.

## Running Locally

1. Restore the API and test dependencies:
   ```bash
   dotnet restore
   ```
2. Install web dependencies and build the SPA (copied into the API's `wwwroot`):
   ```bash
   pnpm --dir src/web install
   pnpm --dir src/web build
   ```
3. Run the API (serves JSON + SPA on the standard ASP.NET ports):
   ```bash
   dotnet run --project api/CompoundInterestCalculator.Api/CompoundInterestCalculator.Api.csproj
   ```

Call the calculator with `curl`/Postman or open `http://localhost:5032` to use the UI. Execute
`dotnet test` any time you want to run the integration and unit suites that validate the API contract.
