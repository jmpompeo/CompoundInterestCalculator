# Deployment Guide

This guide explains how to deploy the controller-based REST API to Azure App Service using the
provided GitHub Actions workflow.

## Prerequisites

- Azure App Service (Linux) created for the API
- Application Insights resource linked to the web app
- GitHub repository secrets configured:
  - `AZURE_WEBAPP_NAME`: Name of the target App Service
  - `AZURE_WEBAPP_PUBLISH_PROFILE`: Publish profile XML for the App Service
- Optional: Deployment slot configured for staging validations

## CI/CD Workflow

1. Update the repository with your changes.
2. Push to `main` (or trigger the workflow manually via the Actions tab).
3. GitHub Actions workflow `.github/workflows/api-deploy.yml` runs the following steps:
   - Restores dependencies.
   - Builds the solution in Release configuration.
   - Executes unit and integration tests.
   - Publishes the API to `./publish`.
   - Deploys the published assets to Azure using the publish profile secret.
4. Monitor the workflow for completion and review logs for any failures.

## Manual Deployment (Optional)

1. Publish locally:
   ```bash
   dotnet publish api/CompoundInterestCalculator.Api/CompoundInterestCalculator.Api.csproj \
     --configuration Release --output ./publish
   ```
2. Deploy using the Azure CLI:
   ```bash
   az webapp deploy \
     --name "$AZURE_WEBAPP_NAME" \
     --resource-group "$RESOURCE_GROUP" \
     --src-path ./publish
   ```
3. Confirm the deployment via the readiness endpoint:
   ```bash
   curl https://$AZURE_WEBAPP_NAME.azurewebsites.net/health/ready | jq
   ```

## Environment Configuration

Place environment-specific overrides in `api/appsettings.{Environment}.json`. Sensitive values (e.g.,
Application Insights connection strings) should be stored in App Service application settings or Azure
Key Vault. Ensure the following settings are present:

- `ApplicationInsights:ConnectionString`
- `Logging:LogLevel` overrides for controller logging if needed
- Optional feature flags for enabling additional cadences

## Post-Deployment Checklist

- Verify `/api/v1/calculations` responds successfully with known test inputs.
- Validate `/health/ready` returns `Healthy` and includes the latest version.
- Confirm Application Insights is receiving telemetry with correlation identifiers.
- Update release notes or changelog as appropriate.
