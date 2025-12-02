using System.Text.Json.Serialization;

namespace CompoundInterestCalculator.Api.Models.Responses;

public sealed class CalculationResponseDto
{
    [JsonPropertyName("startingPrincipal")]
    public decimal StartingPrincipal { get; init; }

    [JsonPropertyName("annualRatePercent")]
    public decimal AnnualRatePercent { get; init; }

    [JsonPropertyName("compoundingCadence")]
    public string CompoundingCadence { get; init; } = "Annual";

    [JsonPropertyName("durationYears")]
    public int DurationYears { get; init; }

    [JsonPropertyName("monthlyContribution")]
    public decimal MonthlyContribution { get; init; }

    [JsonPropertyName("endingBalance")]
    public decimal EndingBalance { get; init; }

    [JsonPropertyName("currencyDisplay")]
    public string CurrencyDisplay { get; init; } = string.Empty;

    [JsonPropertyName("calculationVersion")]
    public string CalculationVersion { get; init; } = string.Empty;

    [JsonPropertyName("traceId")]
    public string TraceId { get; init; } = string.Empty;

    [JsonPropertyName("responseId")]
    public Guid ResponseId { get; init; }

    [JsonPropertyName("clientReference")]
    public string? ClientReference { get; init; }

    [JsonPropertyName("requestedAt")]
    public DateTimeOffset? RequestedAt { get; init; }

    [JsonPropertyName("calculatedAt")]
    public DateTimeOffset CalculatedAt { get; init; }
}
