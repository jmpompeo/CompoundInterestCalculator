# Compound Interest Calculator

This project turns a legacy Azure Function into a full ASP.NET Core experience for financial planning
workflows. It provides deterministic calculation APIs and a lightweight React UI so people can model
future growth, estimate debt and mortgage scenarios, and track day-to-day budget activity in one place.

## What It Does

### API calculators

- `POST /api/v1/growth/contribution` projects balances for accounts that receive recurring monthly
  deposits (e.g., 401(k) or brokerage auto-investing).
- `POST /api/v1/growth/savings` models a fixed principal that compounds according to the cadence you
  choose.
- `POST /api/v1/debt/payoff` estimates debt payoff timing and total interest under payment scenarios.
- `POST /api/v1/mortgage/estimate` estimates monthly payment and total interest for mortgage scenarios.

### Validation and observability

- FluentValidation enforces request rules and returns RFC 7807 validation responses.
- Structured telemetry propagates trace and correlation IDs through requests, logs, and responses.
- Health checks provide readiness coverage for hosted deployments.

### Web experience

- **Interest calculator**: Interactive UI for growth projections powered by the API.
- **Budget tracker**: Monthly budget planning with category-based spending views.
- **Debt log support**: Budget categorization patterns support tracking debt-related spending/payments
  alongside other monthly expenses.

## Tech Highlights

- .NET 8 Web API with API versioning, Swagger UI, health checks, and structured request telemetry.
- Deterministic decimal math in a separate `CompoundCalc` domain assembly for reuse and testability.
- React 18 + Vite + Tailwind UI, bundled into `wwwroot` so ASP.NET Core serves a single app artifact.

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
3. Run the API (serves JSON + SPA on standard ASP.NET ports):
   ```bash
   dotnet run --project api/CompoundInterestCalculator.Api/CompoundInterestCalculator.Api.csproj
   ```

Call the API with `curl`/Postman or open `http://localhost:5032` to use the UI.

Run tests:

```bash
dotnet test
```
