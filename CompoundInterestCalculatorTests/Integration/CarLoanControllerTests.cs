using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;

namespace CompoundInterestCalculatorTests.Integration;

public class CarLoanControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public CarLoanControllerTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task CarLoanEstimate_ReturnsPaymentTotalsAndAmortization()
    {
        var client = _factory.CreateClient();

        var request = new
        {
            vehiclePrice = 35000m,
            cashDownPayment = 3000m,
            tradeInValue = 8000m,
            tradeInPayoff = 5000m,
            annualRatePercent = 6.5m,
            termMonths = 60,
            salesTaxPercent = 7.5m,
            fees = 1200m,
            rebate = 1000m,
            financedExtras = 500m
        };

        var response = await client.PostAsJsonAsync("/api/v1/car-loan/estimate", request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<CarLoanEstimateResponse>();
        Assert.NotNull(payload);
        Assert.Equal(6000m, payload!.totalUpfrontCredit);
        Assert.Equal(32325m, payload.amountFinanced);
        Assert.Equal(632.16m, payload.monthlyPayment);
        Assert.Equal(37929.59m, payload.totalPaid);
        Assert.Equal(5604.59m, payload.totalInterest);
        Assert.Equal(60, payload.amortizationSchedule.Count);
        Assert.False(string.IsNullOrWhiteSpace(payload.traceId));
    }

    [Fact]
    public async Task CarLoanEstimate_WhenTaxNotSpecified_ReturnsValidationProblem()
    {
        var client = _factory.CreateClient();

        var request = new
        {
            vehiclePrice = 35000m,
            cashDownPayment = 3000m,
            tradeInValue = 8000m,
            tradeInPayoff = 5000m,
            annualRatePercent = 6.5m,
            termMonths = 60,
            fees = 1200m,
            rebate = 1000m,
            financedExtras = 500m
        };

        var response = await client.PostAsJsonAsync("/api/v1/car-loan/estimate", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.NotNull(problem);
    }

    private sealed record CarLoanEstimateResponse(
        decimal totalUpfrontCredit,
        decimal amountFinanced,
        decimal monthlyPayment,
        decimal totalPaid,
        decimal totalInterest,
        string traceId,
        IReadOnlyList<CarLoanAmortizationEntryResponse> amortizationSchedule);

    private sealed record CarLoanAmortizationEntryResponse(
        int month,
        decimal payment,
        decimal principal,
        decimal interest,
        decimal remainingBalance);
}
