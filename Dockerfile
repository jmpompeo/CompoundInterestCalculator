FROM mcr.microsoft.com/dotnet/sdk:10.0.403 AS build
WORKDIR /src

RUN apt-get update \
    && apt-get install -y curl ca-certificates gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && node -e 'const v = process.versions.node.split(".").map(Number); if (v[0] !== 22 || v[1] < 23 || (v[1] === 23 && v[2] < 4)) { console.error(`Node 22.23.4 or newer within 22.x required; found ${process.version}`); process.exit(1); }' \
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
RUN pnpm install --frozen-lockfile
RUN pnpm build

WORKDIR /src
RUN dotnet publish api/CompoundInterestCalculator.Api/CompoundInterestCalculator.Api.csproj \
    --configuration Release \
    --output /app/publish \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0.14 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://0.0.0.0:8080
ENTRYPOINT ["dotnet", "CompoundInterestCalculator.Api.dll"]
