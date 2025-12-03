using System;
using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;

namespace CompoundInterestCalculatorTests.Integration;

public class DebtControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public DebtControllerTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task DebtPayoff_ReturnsMonthsAndTotals()
    {
        var client = _factory.CreateClient();

        var request = new
        {
            totalDebt = 1000m,
            monthlyPayment = 600m,
            monthlyRatePercent = 1m
        };

        var response = await client.PostAsJsonAsync("/api/v1/debt/payoff", request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<DebtPayoffResponse>();
        Assert.NotNull(payload);
        Assert.Equal(2, payload!.monthsToPayoff);
        Assert.Equal(1014.10m, payload.totalPaid);
        Assert.Equal("$1,014.10", payload.totalPaidDisplay);
        Assert.Equal(10.01m, payload.minimumPaymentRequired);
        Assert.Equal("$10.01", payload.minimumPaymentDisplay);
        Assert.False(string.IsNullOrWhiteSpace(payload.traceId));
    }

    [Fact]
    public async Task DebtPayoff_WhenPaymentTooLow_ReturnsValidationProblem()
    {
        var client = _factory.CreateClient();

        var request = new
        {
            totalDebt = 1000m,
            monthlyPayment = 5m,
            monthlyRatePercent = 1m
        };

        var response = await client.PostAsJsonAsync("/api/v1/debt/payoff", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.NotNull(problem);
        Assert.Contains("monthlyPayment", problem!.Errors.Keys, StringComparer.OrdinalIgnoreCase);
    }

    private sealed record DebtPayoffResponse(
        int monthsToPayoff,
        decimal totalPaid,
        string totalPaidDisplay,
        decimal minimumPaymentRequired,
        string minimumPaymentDisplay,
        string traceId);
}
