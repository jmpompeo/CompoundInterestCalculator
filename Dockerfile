FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

RUN apt-get update \
    && apt-get install -y curl ca-certificates gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && corepack enable pnpm \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY CompoundInterestCalculator.sln ./
COPY api/CompoundInterestCalculator.Api/CompoundInterestCalculator.Api.csproj api/CompoundInterestCalculator.Api/
COPY CompoundCalc/CompoundCalc.csproj CompoundCalc/
COPY CompoundInterestCalculatorTests/CompoundInterestCalculatorTests.csproj CompoundInterestCalculatorTests/
RUN dotnet restore CompoundInterestCalculator.sln

COPY . .

WORKDIR /src/src/web
RUN pnpm install --frozen-lockfile=false
RUN pnpm build

WORKDIR /src
RUN dotnet publish api/CompoundInterestCalculator.Api/CompoundInterestCalculator.Api.csproj \
    --configuration Release \
    --output /app/publish \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://0.0.0.0:8080
ENTRYPOINT ["dotnet", "CompoundInterestCalculator.Api.dll"]
