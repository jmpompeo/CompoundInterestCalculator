# Research Notes: Convert Azure Function to REST API

## Deployment Strategy

- **Decision**: Use GitHub Actions to build and deploy the ASP.NET Core Web API to Azure App Service (Linux).
- **Rationale**: The repository already targets GitHub; GitHub Actions provides first-class .NET build support, integrates with Azure App Service deployment slots, and allows environment-specific configuration via secrets. Using App Service keeps parity with the current serverless hosting while simplifying REST controller hosting requirements.
- **Alternatives considered**:
  - Azure DevOps Pipelines — powerful but adds toolchain overhead for teams already on GitHub.
  - Manual ZIP deploy — fast for experiments but contradicts the "easily deployable" requirement and lacks repeatability.

## Authentication & Authorization

- **Decision**: Assume upstream API gateway or platform service handles authentication; the new controller endpoints remain anonymous but emit correlation tokens for downstream tracing.
- **Rationale**: Specification states authentication is handled by an existing platform service and is out of scope. Maintaining anonymous access mirrors the current Function behavior while keeping the interface ready for gateway enforcement.
- **Alternatives considered**:
  - Embedding JWT validation inside the API — increases scope and contradicts spec assumptions.
  - API keys per client — introduces key distribution complexity and is unnecessary when a gateway is already expected.

## Configuration Management

- **Decision**: Standardize on `appsettings.{Environment}.json` plus Azure App Service application settings for secrets; manage shared values via Azure App Configuration if needed.
- **Rationale**: ASP.NET Core natively supports environment-specific JSON files merged with environment variables. App Service exposes configuration through its portal and CLI, aligning with the "easily deployable" goal without introducing extra tooling. Azure App Configuration can be added later without code changes if central management is required.
- **Alternatives considered**:
  - Storing configuration only in environment variables — workable but less maintainable for structured settings like logging and feature flags.
  - Introducing Terraform or Bicep templates — valuable long term but adds upfront complexity beyond current scope.
