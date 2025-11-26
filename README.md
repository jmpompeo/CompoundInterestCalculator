# Compound Interest Calculator API

The Compound Interest Calculator has been migrated from an Azure Function to an ASP.NET Core
controller-based REST API. The service exposes stable, versioned endpoints for compound interest
calculations while preserving the legacy deterministic math and adding stronger logging and
observability.

## Project Structure

```text
api/CompoundInterestCalculator.Api/     # ASP.NET Core Web API project
CompoundCalc/                           # Domain services, models, helpers
CompoundInterestCalculatorTests/        # Unit and integration test suite
specs/001-enable-rest-api/              # Feature documentation, plan, contracts, tasks
```

## Running Locally

1. Restore .NET dependencies:
   ```bash
   dotnet restore
   ```
2. Prepare the frontend workspace (requires Node 20+; `corepack` ships with Node):
   ```bash
   cd src/web
   corepack enable pnpm
   pnpm install
   cd ../../
   ```
   _If `corepack enable pnpm` needs elevated permissions (Homebrew installs on macOS often do), rerun it
   with `sudo` or install pnpm globally._
3. For API + UI development you have two options:
   - **Run the Vite dev server** for instant UI feedback while keeping the API on its normal ports:
     ```bash
     # terminal 1
     pnpm --dir src/web dev

     # terminal 2
     dotnet run --project api/CompoundInterestCalculator.Api/CompoundInterestCalculator.Api.csproj
     ```
     The Vite dev server proxies `/api` calls to the ASP.NET backend.
   - **Build the SPA into `wwwroot`** and let ASP.NET serve it (mirrors the production setup):
     ```bash
     pnpm --dir src/web build   # copies dist files into api/CompoundInterestCalculator.Api/wwwroot
     dotnet run --project api/CompoundInterestCalculator.Api/CompoundInterestCalculator.Api.csproj
     ```
4. Call the calculation endpoint (or use the new UI at `http://localhost:5032/` when running via ASP.NET):
   ```bash
   curl -s \
     -X POST http://localhost:5000/api/v1/calculations \
     -H "Content-Type: application/json" \
     -d '{
       "principal": 5000,
       "annualRatePercent": 4.25,
       "compoundingCadence": "Annual",
       "durationYears": 5,
       "clientReference": "local-test"
     }' | jq
   ```
5. Inspect logs in the console for correlation IDs and validation messages.

## Frontend UI (src/web)

- Vite + React + TypeScript with Tailwind CSS provides a small but extensible SPA.
- `pnpm dev` (inside `src/web`) spins up the standalone UI with hot reload and proxies API calls to `http://localhost:5032`.
- `pnpm build` compiles the assets and automatically copies them into `api/CompoundInterestCalculator.Api/wwwroot` so ASP.NET Core serves the same bundle you'll deploy to Render.
- The UI currently includes a responsive form, inline validation, cadence selector cards, and a results panel that surfaces ending balance, metadata, and trace identifiers returned from the API.

## Endpoints

- `POST /api/v1/calculations`
  - Calculates compound interest with decimal precision and returns metadata including trace and
    response identifiers.
  - Validation errors return RFC 7807 problem details with the same correlation token present in logs.
- `GET /health/ready`
  - Reports readiness status, aggregated health check details, and the deployed version.

## Testing

Run the complete suite (unit + integration):
```bash
dotnet test
```

## Deployment

Render handles deployment using the provided `render.yaml` blueprint. Create a new Web Service from the
Render dashboard, point it at this repository, and choose the Free plan. Render builds the API via the
Dockerfile, sets `ASPNETCORE_ENVIRONMENT=Production`, and exposes the readiness probe at
`/health/ready`. The GitHub Actions workflow `.github/workflows/ci_build.yml` restores, builds, tests,
and (when changes land on `main`) pings the Render deploy hook stored in the `RENDER_DEPLOY_HOOK`
secret so production stays up to date. The detailed setup steps live in `docs/deployment.md`. The hosted
Swagger UI is always available at `/swagger` for interactive testing once the service is running.

## Telemetry & Logging

- Correlation IDs are propagated via the `x-correlation-id` header and included in every structured log.
- Validation and server errors emit structured controller logs explaining why requests failed.
- Logs stream to stdout/stderr for collection by the hosting platform (Render keeps 30 days on the
  free tier).
