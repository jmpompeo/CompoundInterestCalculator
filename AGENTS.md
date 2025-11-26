# Codex Agent Context

## Languages
- C# 12 on .NET 8 (ASP.NET Core Web API)

## Frameworks & Libraries
- ASP.NET Core MVC
- Newtonsoft.Json (legacy contract parity)
- FluentValidation
- ASP.NET Core Health Checks

## Data/Storage
- N/A (stateless calculations); note any new persistence requirement explicitly

## Project Type
- Backend API (`api/` project)

## Notes
- Conversion from the legacy function implementation to a controller-based REST API requires deterministic decimal calculations and structured telemetry.
- Deployments target the Render free tier using the repo-level Dockerfile and deploy hook.
