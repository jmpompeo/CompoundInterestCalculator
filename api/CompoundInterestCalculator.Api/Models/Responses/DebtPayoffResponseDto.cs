using System.Text.Json.Serialization;

namespace CompoundInterestCalculator.Api.Models.Responses;

public sealed class DebtPayoffResponseDto
{
    [JsonPropertyName("startingDebt")]
    public decimal StartingDebt { get; init; }

    [JsonPropertyName("monthlyPayment")]
    public decimal MonthlyPayment { get; init; }

    [JsonPropertyName("monthlyRatePercent")]
    public decimal MonthlyRatePercent { get; init; }

    [JsonPropertyName("minimumPaymentRequired")]
    public decimal MinimumPaymentRequired { get; init; }

    [JsonPropertyName("minimumPaymentDisplay")]
    public string MinimumPaymentDisplay { get; init; } = string.Empty;

    [JsonPropertyName("monthsToPayoff")]
    public int MonthsToPayoff { get; init; }

    [JsonPropertyName("totalPaid")]
    public decimal TotalPaid { get; init; }

    [JsonPropertyName("totalInterestPaid")]
    public decimal TotalInterestPaid { get; init; }

    [JsonPropertyName("totalPaidDisplay")]
    public string TotalPaidDisplay { get; init; } = string.Empty;

    [JsonPropertyName("totalInterestDisplay")]
    public string TotalInterestDisplay { get; init; } = string.Empty;

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
