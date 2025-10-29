using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace CompoundInterestCalculatorTests.Integration;

public class HealthChecksTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public HealthChecksTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task ReadinessEndpoint_ReturnsHealthyStatus()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/health/ready");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ReadinessResponse>();
        Assert.NotNull(payload);
        Assert.Equal("Healthy", payload!.status);
        Assert.False(string.IsNullOrWhiteSpace(payload.version));
        Assert.True(payload.checks.Any());
    }

    private sealed record ReadinessResponse(string status, IEnumerable<Check> checks, string version)
    {
        public string timestamp { get; init; } = string.Empty;
    }

    private sealed record Check(string name, string status, string detail);
}
