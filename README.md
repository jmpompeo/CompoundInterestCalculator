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

1. Restore dependencies and build:
   ```bash
   dotnet restore
   dotnet build
   ```
2. Run the API:
   ```bash
   dotnet run --project api/CompoundInterestCalculator.Api/CompoundInterestCalculator.Api.csproj
   ```
3. Call the calculation endpoint:
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
4. Inspect logs in the console for correlation IDs and validation messages.

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

A GitHub Actions workflow (`.github/workflows/api-deploy.yml`) builds, tests, and deploys the API to
Azure App Service. Configure repository secrets `AZURE_WEBAPP_NAME` and
`AZURE_WEBAPP_PUBLISH_PROFILE` before enabling the workflow. See `docs/deployment.md` for the full
checklist.

## Telemetry & Logging

- Correlation IDs are propagated via the `x-correlation-id` header and included in Application Insights
  traces.
- Validation and server errors emit structured controller logs explaining why requests failed.
- Application Insights can be configured via `appsettings.{Environment}.json` or App Service settings.
