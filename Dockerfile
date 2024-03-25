FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /source

COPY CompoundCalc/*.csproj .
RUN dotnet restore

COPY CompoundCalc/. .
RUN dotnet publish -c release --no-restore -o /compoundint

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /CompoundCalc
COPY --from=build /compoundint .
ENTRYPOINT ["dotnet", "CompoundCalc.dll"]