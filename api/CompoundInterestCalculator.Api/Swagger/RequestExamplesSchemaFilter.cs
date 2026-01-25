using CompoundInterestCalculator.Api.Models.Requests;
using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace CompoundInterestCalculator.Api.Swagger;

public sealed class RequestExamplesSchemaFilter : ISchemaFilter
{
    public void Apply(OpenApiSchema schema, SchemaFilterContext context)
    {
        if (schema.Example is not null)
        {
            return;
        }

        schema.Example = context.Type switch
        {
            var t when t == typeof(SavingsGrowthRequestDto) => BuildSavingsGrowthExample(),
            var t when t == typeof(ContributionGrowthRequestDto) => BuildContributionGrowthExample(),
            var t when t == typeof(MortgageEstimateRequestDto) => BuildMortgageEstimateExample(),
            var t when t == typeof(DebtPayoffRequestDto) => BuildDebtPayoffExample(),
            _ => schema.Example
        };
    }

    private static OpenApiObject BuildSavingsGrowthExample() => new()
    {
        ["principal"] = new OpenApiDouble(10_000d),
        ["annualRatePercent"] = new OpenApiDouble(5.25d),
        ["compoundingCadence"] = new OpenApiString("Monthly"),
        ["durationYears"] = new OpenApiInteger(10),
        ["clientReference"] = new OpenApiString("planning-demo")
    };

    private static OpenApiObject BuildContributionGrowthExample() => new()
    {
        ["principal"] = new OpenApiDouble(5_000d),
        ["annualRatePercent"] = new OpenApiDouble(6.0d),
        ["compoundingCadence"] = new OpenApiString("Monthly"),
        ["durationYears"] = new OpenApiInteger(20),
        ["monthlyContribution"] = new OpenApiDouble(200d),
        ["clientReference"] = new OpenApiString("contrib-demo")
    };

    private static OpenApiObject BuildMortgageEstimateExample() => new()
    {
        ["homePrice"] = new OpenApiDouble(400_000d),
        ["downPaymentValue"] = new OpenApiDouble(80_000d),
        ["downPaymentType"] = new OpenApiString("Amount"),
        ["annualRatePercent"] = new OpenApiDouble(6.25d),
        ["termYears"] = new OpenApiInteger(30),
        ["propertyTaxType"] = new OpenApiString("Percent"),
        ["propertyTaxValue"] = new OpenApiDouble(1.1d),
        ["pmiType"] = new OpenApiString("Percent"),
        ["pmiValue"] = new OpenApiDouble(0.5d),
        ["clientReference"] = new OpenApiString("mortgage-demo")
    };

    private static OpenApiObject BuildDebtPayoffExample() => new()
    {
        ["totalDebt"] = new OpenApiDouble(15_000d),
        ["monthlyPayment"] = new OpenApiDouble(400d),
        ["monthlyRatePercent"] = new OpenApiDouble(1.0d),
        ["clientReference"] = new OpenApiString("debt-demo")
    };
}
