using CompoundInterestCalculator.Api.Models.Requests;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;
using System.Text.Json.Nodes;

namespace CompoundInterestCalculator.Api.Swagger;

public sealed class RequestExamplesSchemaFilter : ISchemaFilter
{
    public void Apply(IOpenApiSchema schema, SchemaFilterContext context)
    {
        if (schema is not OpenApiSchema mutableSchema || mutableSchema.Example is not null)
        {
            return;
        }

        mutableSchema.Example = context.Type switch
        {
            var t when t == typeof(SavingsGrowthRequestDto) => BuildSavingsGrowthExample(),
            var t when t == typeof(ContributionGrowthRequestDto) => BuildContributionGrowthExample(),
            var t when t == typeof(MortgageEstimateRequestDto) => BuildMortgageEstimateExample(),
            var t when t == typeof(DebtPayoffRequestDto) => BuildDebtPayoffExample(),
            _ => mutableSchema.Example
        };
    }

    private static JsonObject BuildSavingsGrowthExample() => new()
    {
        ["principal"] = JsonValue.Create(10_000m),
        ["annualRatePercent"] = JsonValue.Create(5.25m),
        ["compoundingCadence"] = JsonValue.Create("Monthly"),
        ["durationYears"] = JsonValue.Create(10),
        ["clientReference"] = JsonValue.Create("planning-demo")
    };

    private static JsonObject BuildContributionGrowthExample() => new()
    {
        ["principal"] = JsonValue.Create(5_000m),
        ["annualRatePercent"] = JsonValue.Create(6.0m),
        ["compoundingCadence"] = JsonValue.Create("Monthly"),
        ["durationYears"] = JsonValue.Create(20),
        ["monthlyContribution"] = JsonValue.Create(200m),
        ["clientReference"] = JsonValue.Create("contrib-demo")
    };

    private static JsonObject BuildMortgageEstimateExample() => new()
    {
        ["homePrice"] = JsonValue.Create(400_000m),
        ["downPaymentValue"] = JsonValue.Create(80_000m),
        ["downPaymentType"] = JsonValue.Create("Amount"),
        ["annualRatePercent"] = JsonValue.Create(6.25m),
        ["termYears"] = JsonValue.Create(30),
        ["propertyTaxType"] = JsonValue.Create("Percent"),
        ["propertyTaxValue"] = JsonValue.Create(1.1m),
        ["pmiType"] = JsonValue.Create("Percent"),
        ["pmiValue"] = JsonValue.Create(0.5m),
        ["clientReference"] = JsonValue.Create("mortgage-demo")
    };

    private static JsonObject BuildDebtPayoffExample() => new()
    {
        ["totalDebt"] = JsonValue.Create(15_000m),
        ["monthlyPayment"] = JsonValue.Create(400m),
        ["monthlyRatePercent"] = JsonValue.Create(1.0m),
        ["clientReference"] = JsonValue.Create("debt-demo")
    };
}
