FROM mcr.microsoft.com/dotnet/sdk:6.0 AS build
WORKDIR /source

COPY CompoundInterestCalculator/*.csproj .
RUN dotnet restore

COPY CompoundInterestCalculator/. .
RUN dotnet publish -c release --no-restore -o /compoundint

FROM mcr.microsoft.com/dotnet/aspnet:6.0
WORKDIR /CompoundInterestCalculator
COPY --from=build /compoundint .
ENTRYPOINT ["dotnet", "CompoundInterestCalculator.dll"]