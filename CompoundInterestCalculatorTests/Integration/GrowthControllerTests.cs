using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace CompoundInterestCalculatorTests.Integration;

public class GrowthControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public GrowthControllerTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task ContributionGrowth_ReturnsEndingBalanceAndMetadata()
    {
        var client = _factory.CreateClient();

        var request = new
        {
            principal = 10000m,
            annualRatePercent = 5.5m,
            compoundingCadence = "Annual",
            durationYears = 10,
            monthlyContribution = 100m
        };

        var response = await client.PostAsJsonAsync("/api/v1/growth/contribution", request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<CalculationResponse>();
        Assert.NotNull(payload);
        Assert.Equal(10000m, payload!.startingPrincipal);
        Assert.Equal(100m, payload.monthlyContribution);
        Assert.Equal(33381.64m, payload.endingBalance);
        Assert.Equal("$33,381.64", payload.currencyDisplay);
        Assert.False(string.IsNullOrWhiteSpace(payload.traceId));
        Assert.False(string.IsNullOrWhiteSpace(payload.responseId));
    }

    [Fact]
    public async Task ContributionGrowth_MonthlyContributionImpactsBalance()
    {
        var client = _factory.CreateClient();

        var baseRequest = new
        {
            principal = 10000m,
            annualRatePercent = 5.5m,
            compoundingCadence = "Annual",
            durationYears = 10,
            monthlyContribution = 0m
        };

        var extraContributionRequest = new
        {
            principal = 10000m,
            annualRatePercent = 5.5m,
            compoundingCadence = "Annual",
            durationYears = 10,
            monthlyContribution = 250m
        };

        var baselineResponse = await client.PostAsJsonAsync("/api/v1/growth/contribution", baseRequest);
        var boostedResponse = await client.PostAsJsonAsync("/api/v1/growth/contribution", extraContributionRequest);

        var baseline = await baselineResponse.Content.ReadFromJsonAsync<CalculationResponse>();
        var boosted = await boostedResponse.Content.ReadFromJsonAsync<CalculationResponse>();

        Assert.NotNull(baseline);
        Assert.NotNull(boosted);
        Assert.True(boosted!.endingBalance > baseline!.endingBalance);
    }

    [Fact]
    public async Task SavingsGrowth_DoesNotRequireMonthlyContribution()
    {
        var client = _factory.CreateClient();

        var request = new
        {
            principal = 15000m,
            annualRatePercent = 4.0m,
            compoundingCadence = "Monthly",
            durationYears = 3
        };

        var response = await client.PostAsJsonAsync("/api/v1/growth/savings", request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<CalculationResponse>();
        Assert.NotNull(payload);
        Assert.Equal(0m, payload!.monthlyContribution);
        Assert.True(payload.endingBalance > request.principal);
    }

    private sealed record CalculationResponse(
        decimal startingPrincipal,
        decimal monthlyContribution,
        decimal endingBalance,
        string currencyDisplay,
        string traceId,
        string responseId);
}
