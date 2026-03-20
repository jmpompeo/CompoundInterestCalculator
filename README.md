# Compound Interest Calculator

Full-stack personal finance app with a .NET API and React SPA.

## Current Functionality

### API calculators

- `POST /api/v1/growth/contribution`: compound growth with monthly contributions
- `POST /api/v1/growth/savings`: compound growth with no recurring contributions
- `POST /api/v1/debt/payoff`: debt payoff timeline and interest totals
- `POST /api/v1/mortgage/estimate`: monthly payment and total-interest estimate

### Web app tabs

- `Interest calculator`: UI for growth, debt payoff, and mortgage calculations
- `Budget tracker`: local-first monthly budgeting and expense tracking
- `Debt log`: local-first debt and payment tracking with payoff projections via `/api/v1/debt/payoff`

## Tech Stack

- .NET 10 ASP.NET Core Web API with versioning, Swagger, health checks, FluentValidation, and structured logging
- `CompoundCalc` domain library for deterministic decimal math
- React 18 + Vite + Tailwind SPA served by the API from `wwwroot`
- IndexedDB persistence for budget and debt-log tab data

## Run Locally

1. Restore .NET dependencies:
   ```bash
   dotnet restore
   ```
2. Install and build frontend assets:
   ```bash
   pnpm --dir src/web install
   pnpm --dir src/web build
   ```
3. Start the API + SPA host:
   ```bash
   dotnet run --project api/CompoundInterestCalculator.Api/CompoundInterestCalculator.Api.csproj
   ```
4. Open:
   - App: `http://localhost:5032`
   - Swagger: `http://localhost:5032/swagger`

## Tests

```bash
dotnet test
```
