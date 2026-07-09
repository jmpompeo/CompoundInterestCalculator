using System.Text.Json.Serialization;

namespace CompoundInterestCalculator.Api.Models.Requests;

public sealed class DebtStrategyRequestDto
{
    [JsonPropertyName("monthlyBudget")]
    public decimal MonthlyBudget { get; init; }

    [JsonPropertyName("debts")]
    public IReadOnlyList<DebtStrategyDebtRequestDto> Debts { get; init; } = [];

    [JsonPropertyName("clientReference")]
    public string? ClientReference { get; init; }

    [JsonPropertyName("requestedAt")]
    public DateTimeOffset? RequestedAt { get; init; }
}

public sealed class DebtStrategyDebtRequestDto
{
    [JsonPropertyName("clientDebtId")]
    public string ClientDebtId { get; init; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; init; } = string.Empty;

    [JsonPropertyName("currentBalance")]
    public decimal CurrentBalance { get; init; }

    [JsonPropertyName("annualAprPercent")]
    public decimal AnnualAprPercent { get; init; }

    [JsonPropertyName("minimumPayment")]
    public decimal MinimumPayment { get; init; }
}
