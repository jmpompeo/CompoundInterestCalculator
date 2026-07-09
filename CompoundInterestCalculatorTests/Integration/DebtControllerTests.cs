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

    [Fact]
    public async Task DebtStrategy_ReturnsBothPlans()
    {
        var client = _factory.CreateClient();

        var request = new
        {
            monthlyBudget = 500m,
            debts = new[]
            {
                new
                {
                    clientDebtId = "large-high",
                    name = "Large High APR",
                    currentBalance = 5000m,
                    annualAprPercent = 20m,
                    minimumPayment = 100m
                },
                new
                {
                    clientDebtId = "small-low",
                    name = "Small Low APR",
                    currentBalance = 1000m,
                    annualAprPercent = 5m,
                    minimumPayment = 25m
                }
            }
        };

        var response = await client.PostAsJsonAsync("/api/v1/debt/strategy", request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<DebtStrategyResponse>();
        Assert.NotNull(payload);
        Assert.Equal(500m, payload!.monthlyBudget);
        Assert.Equal("Avalanche", payload.recommendedStrategy);
        Assert.Equal("small-low", payload.snowball.payoffOrder[0].clientDebtId);
        Assert.Equal("large-high", payload.avalanche.payoffOrder[0].clientDebtId);
        Assert.NotEmpty(payload.snowball.timeline);
        Assert.False(string.IsNullOrWhiteSpace(payload.traceId));
    }

    [Fact]
    public async Task DebtStrategy_WhenBudgetBelowMinimums_ReturnsValidationProblem()
    {
        var client = _factory.CreateClient();

        var request = new
        {
            monthlyBudget = 10m,
            debts = new[]
            {
                new
                {
                    clientDebtId = "card",
                    name = "Card",
                    currentBalance = 1000m,
                    annualAprPercent = 10m,
                    minimumPayment = 100m
                }
            }
        };

        var response = await client.PostAsJsonAsync("/api/v1/debt/strategy", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.NotNull(problem);
        Assert.Contains("monthlyBudget", problem!.Errors.Keys, StringComparer.OrdinalIgnoreCase);
    }

    private sealed record DebtPayoffResponse(
        int monthsToPayoff,
        decimal totalPaid,
        string totalPaidDisplay,
        decimal minimumPaymentRequired,
        string minimumPaymentDisplay,
        string traceId);

    private sealed record DebtStrategyResponse(
        decimal monthlyBudget,
        string recommendedStrategy,
        DebtStrategyPlanResponse snowball,
        DebtStrategyPlanResponse avalanche,
        string traceId);

    private sealed record DebtStrategyPlanResponse(
        string strategy,
        int monthsToPayoff,
        decimal totalInterestPaid,
        IReadOnlyList<DebtStrategyPayoffOrderItemResponse> payoffOrder,
        IReadOnlyList<DebtStrategyMonthResponse> timeline);

    private sealed record DebtStrategyPayoffOrderItemResponse(
        string clientDebtId,
        string name,
        int payoffMonth);

    private sealed record DebtStrategyMonthResponse(
        int monthNumber,
        decimal endingBalance);
}
