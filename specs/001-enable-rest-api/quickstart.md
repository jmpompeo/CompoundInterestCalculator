# Quickstart: Convert Azure Function to REST API

## Prerequisites

- .NET 8 SDK installed locally
- Azure CLI logged in with access to target App Service subscription
- Application Insights resource configured (reuse existing or create new)
- GitHub repository secrets set: `AZURE_WEBAPP_NAME`, `AZURE_WEBAPP_PUBLISH_PROFILE`

## Local Setup

1. Navigate to the API project:
   ```bash
   cd api
   ```
2. Restore dependencies:
   ```bash
   dotnet restore
   ```
3. Run unit tests for calculation services:
   ```bash
   dotnet test ../CompoundInterestCalculatorTests/CompoundInterestCalculatorTests.csproj
   ```
4. Launch the Web API locally:
   ```bash
   dotnet run --project api
   ```
5. Invoke the calculation endpoint:
   ```bash
   curl -s \
     -X POST http://localhost:5000/api/v1/calculations \
     -H "Content-Type: application/json" \
     -d '{
       "principal": 10000,
       "annualRatePercent": 5.5,
       "compoundingCadence": "Annual",
       "durationYears": 10
     }' | jq
   ```

## Observability Verification

- Examine console output for structured logs containing `traceId` and validation outcomes.
- Confirm Application Insights traces appear when running with `ASPNETCORE_ENVIRONMENT=Development` and instrumentation key configured.

## Deployment Pipeline

1. Configure GitHub Actions workflow (provided separately) to build and deploy the API when pushing to `main` or release branches.
2. Ensure secrets `AZURE_WEBAPP_NAME` and `AZURE_WEBAPP_PUBLISH_PROFILE` are present in repository settings.
3. On merge, the workflow will:
   - Build the API
   - Run unit + integration tests
   - Publish artifacts
   - Deploy to the specified App Service slot

## Post-Deployment Validation

1. Run readiness probe:
   ```bash
   curl https://$BASE_URL/health/ready | jq
   ```
   - Confirm the `status` field reports `Healthy` and the `version` matches the deployed build.
2. Trigger a calculation request and verify REST response matches legacy Function output.
   ```bash
   curl -s \
     -X POST https://$BASE_URL/api/v1/calculations \
     -H "Content-Type: application/json" \
     -d '{
       "principal": 5000,
       "annualRatePercent": 4.25,
       "compoundingCadence": "Annual",
       "durationYears": 5,
       "clientReference": "smoke-test"
     }' | jq
   ```
   - Ensure the response echoes the `clientReference` and includes a `traceId`.
3. Inspect response headers for `x-correlation-id` and verify the same value appears in Application Insights traces.
4. Review controller logs in Application Insights for traceability and plain-language failure reasons.
