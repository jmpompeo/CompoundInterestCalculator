using System;
using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;

namespace CompoundInterestCalculatorTests.Integration;

public class MortgageControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public MortgageControllerTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task MortgageEstimate_ReturnsMonthlyPaymentAndTotals()
    {
        var client = _factory.CreateClient();

        var request = new
        {
            homePrice = 375000m,
            downPaymentValue = 75000m,
            downPaymentType = "Amount",
            annualRatePercent = 6m,
            termYears = 30
        };

        var response = await client.PostAsJsonAsync("/api/v1/mortgage/estimate", request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<MortgageEstimateResponse>();
        Assert.NotNull(payload);
        Assert.Equal(300000m, payload!.loanAmount);
        Assert.Equal(1798.65m, payload.monthlyPrincipalAndInterest);
        Assert.Equal(1798.65m, payload.monthlyTotalPayment);
        Assert.Equal(647514.57m, payload.totalPaid);
        Assert.Equal(347514.57m, payload.totalInterest);
        Assert.Equal("$300,000.00", payload.loanAmountDisplay);
        Assert.Equal("$1,798.65", payload.monthlyPrincipalAndInterestDisplay);
        Assert.Equal("$1,798.65", payload.monthlyTotalPaymentDisplay);
        Assert.False(string.IsNullOrWhiteSpace(payload.traceId));
    }

    [Fact]
    public async Task MortgageEstimate_WhenDownPaymentExceedsPrice_ReturnsValidationProblem()
    {
        var client = _factory.CreateClient();

        var request = new
        {
            homePrice = 200000m,
            downPaymentValue = 250000m,
            downPaymentType = "Amount",
            annualRatePercent = 6m,
            termYears = 30
        };

        var response = await client.PostAsJsonAsync("/api/v1/mortgage/estimate", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.NotNull(problem);
        Assert.Contains("downPaymentValue", problem!.Errors.Keys, StringComparer.OrdinalIgnoreCase);
    }

    private sealed record MortgageEstimateResponse(
        decimal loanAmount,
        decimal monthlyPrincipalAndInterest,
        decimal monthlyTotalPayment,
        decimal totalPaid,
        decimal totalInterest,
        string loanAmountDisplay,
        string monthlyPrincipalAndInterestDisplay,
        string monthlyTotalPaymentDisplay,
        string traceId);

    [Fact]
    public async Task MortgageEstimate_WhenDownPaymentProvidedAsPercent_ComputesLoanAmount()
    {
        var client = _factory.CreateClient();

        var request = new
        {
            homePrice = 500000m,
            downPaymentValue = 20m,
            downPaymentType = "Percent",
            annualRatePercent = 6m,
            termYears = 30
        };

        var response = await client.PostAsJsonAsync("/api/v1/mortgage/estimate", request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<MortgageEstimateResponse>();
        Assert.NotNull(payload);
        Assert.Equal(400000m, payload!.loanAmount);
    }

    [Fact]
    public async Task MortgageEstimate_WhenAddOnsProvided_ReturnsMonthlyTotals()
    {
        var client = _factory.CreateClient();

        var request = new
        {
            homePrice = 300000m,
            downPaymentValue = 30000m,
            downPaymentType = "Amount",
            annualRatePercent = 6m,
            termYears = 30,
            propertyTaxType = "Amount",
            propertyTaxValue = 3600m,
            pmiType = "Percent",
            pmiValue = 0.5m
        };

        var response = await client.PostAsJsonAsync("/api/v1/mortgage/estimate", request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<MortgageEstimateResponse>();
        Assert.NotNull(payload);
        Assert.Equal(1618.79m, payload!.monthlyPrincipalAndInterest);
        Assert.Equal(2031.29m, payload.monthlyTotalPayment);
        Assert.Equal("$2,031.29", payload.monthlyTotalPaymentDisplay);
    }
}
