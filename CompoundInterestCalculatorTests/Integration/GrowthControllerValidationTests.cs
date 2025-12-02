using System.Net;
using System.Net.Http.Json;
using CompoundInterestCalculator.Api.Middleware;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;

namespace CompoundInterestCalculatorTests.Integration;

public class GrowthControllerValidationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public GrowthControllerValidationTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task ContributionGrowth_WithInvalidPayload_ReturnsProblemDetailsWithCorrelationId()
    {
        var client = _factory.CreateClient();

        var request = new
        {
            principal = -1m,
            annualRatePercent = 105m,
            compoundingCadence = "Weekly",
            durationYears = 150,
            monthlyContribution = -50m
        };

        var response = await client.PostAsJsonAsync("/api/v1/growth/contribution", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.True(response.Headers.Contains(CorrelationIdMiddleware.HeaderName));

        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.NotNull(problem);
        Assert.Equal(400, problem!.Status);
        Assert.Contains("principal", problem.Errors.Keys, StringComparer.OrdinalIgnoreCase);
        Assert.Contains("annualRatePercent", problem.Errors.Keys, StringComparer.OrdinalIgnoreCase);
        Assert.Contains("compoundingCadence", problem.Errors.Keys, StringComparer.OrdinalIgnoreCase);
        Assert.Contains("durationYears", problem.Errors.Keys, StringComparer.OrdinalIgnoreCase);
        Assert.Contains("monthlyContribution", problem.Errors.Keys, StringComparer.OrdinalIgnoreCase);
        Assert.True(problem.Extensions.TryGetValue("traceId", out var traceIdObj));
        Assert.False(string.IsNullOrWhiteSpace(traceIdObj?.ToString()));
    }
}
