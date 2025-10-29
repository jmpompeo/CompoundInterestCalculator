using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace CompoundInterestCalculatorTests.Integration;

public class CalculationsControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public CalculationsControllerTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task PostCalculations_ReturnsEndingBalanceAndMetadata()
    {
        var client = _factory.CreateClient();

        var request = new
        {
            principal = 10000m,
            annualRatePercent = 5.5m,
            compoundingCadence = "Annual",
            durationYears = 10
        };

        var response = await client.PostAsJsonAsync("/api/v1/calculations", request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<CalculationResponse>();
        Assert.NotNull(payload);
        Assert.Equal(10000m, payload!.startingPrincipal);
        Assert.Equal(17081.44m, payload.endingBalance);
        Assert.Equal("$17,081.44", payload.currencyDisplay);
        Assert.False(string.IsNullOrWhiteSpace(payload.traceId));
        Assert.False(string.IsNullOrWhiteSpace(payload.responseId));
    }

    private sealed record CalculationResponse(
        decimal startingPrincipal,
        decimal endingBalance,
        string currencyDisplay,
        string traceId,
        string responseId);
}
