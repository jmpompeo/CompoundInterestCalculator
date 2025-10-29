# Codex Agent Context

## Languages
- C# 12 on .NET 8 (ASP.NET Core Web API)

## Frameworks & Libraries
- ASP.NET Core MVC
- Application Insights
- Newtonsoft.Json (legacy contract parity)
- FluentValidation
- ASP.NET Core Health Checks

## Data/Storage
- N/A (stateless calculations); note any new persistence requirement explicitly

## Project Type
- Backend API (`api/` project)

## Notes
- Conversion from Azure Function to controller-based REST API requires deterministic decimal calculations and structured telemetry.
