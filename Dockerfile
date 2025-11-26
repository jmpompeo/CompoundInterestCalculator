FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY CompoundInterestCalculator.sln ./
COPY api/CompoundInterestCalculator.Api/CompoundInterestCalculator.Api.csproj api/CompoundInterestCalculator.Api/
COPY CompoundCalc/CompoundCalc.csproj CompoundCalc/
COPY CompoundInterestCalculatorTests/CompoundInterestCalculatorTests.csproj CompoundInterestCalculatorTests/
RUN dotnet restore CompoundInterestCalculator.sln

COPY . .
RUN dotnet publish api/CompoundInterestCalculator.Api/CompoundInterestCalculator.Api.csproj \
    --configuration Release \
    --output /app/publish \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://0.0.0.0:8080
ENTRYPOINT ["dotnet", "CompoundInterestCalculator.Api.dll"]
