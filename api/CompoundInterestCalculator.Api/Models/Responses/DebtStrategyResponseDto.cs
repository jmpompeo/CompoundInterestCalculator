using System.Text.Json.Serialization;

namespace CompoundInterestCalculator.Api.Models.Responses;

public sealed class DebtStrategyResponseDto
{
    [JsonPropertyName("monthlyBudget")]
    public decimal MonthlyBudget { get; init; }

    [JsonPropertyName("monthlyBudgetDisplay")]
    public string MonthlyBudgetDisplay { get; init; } = string.Empty;

    [JsonPropertyName("totalMinimumPayment")]
    public decimal TotalMinimumPayment { get; init; }

    [JsonPropertyName("totalMinimumPaymentDisplay")]
    public string TotalMinimumPaymentDisplay { get; init; } = string.Empty;

    [JsonPropertyName("recommendedStrategy")]
    public string RecommendedStrategy { get; init; } = string.Empty;

    [JsonPropertyName("snowball")]
    public DebtStrategyPlanResponseDto Snowball { get; init; } = new();

    [JsonPropertyName("avalanche")]
    public DebtStrategyPlanResponseDto Avalanche { get; init; } = new();

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

public sealed class DebtStrategyPlanResponseDto
{
    [JsonPropertyName("strategy")]
    public string Strategy { get; init; } = string.Empty;

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

    [JsonPropertyName("finalPayoffDateLabel")]
    public string FinalPayoffDateLabel { get; init; } = string.Empty;

    [JsonPropertyName("payoffOrder")]
    public IReadOnlyList<DebtStrategyPayoffOrderItemResponseDto> PayoffOrder { get; init; } = [];

    [JsonPropertyName("timeline")]
    public IReadOnlyList<DebtStrategyMonthResponseDto> Timeline { get; init; } = [];
}

public sealed class DebtStrategyPayoffOrderItemResponseDto
{
    [JsonPropertyName("clientDebtId")]
    public string ClientDebtId { get; init; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; init; } = string.Empty;

    [JsonPropertyName("payoffMonth")]
    public int PayoffMonth { get; init; }

    [JsonPropertyName("startingBalance")]
    public decimal StartingBalance { get; init; }

    [JsonPropertyName("annualAprPercent")]
    public decimal AnnualAprPercent { get; init; }
}

public sealed class DebtStrategyMonthResponseDto
{
    [JsonPropertyName("monthNumber")]
    public int MonthNumber { get; init; }

    [JsonPropertyName("startingBalance")]
    public decimal StartingBalance { get; init; }

    [JsonPropertyName("interestCharged")]
    public decimal InterestCharged { get; init; }

    [JsonPropertyName("paymentApplied")]
    public decimal PaymentApplied { get; init; }

    [JsonPropertyName("endingBalance")]
    public decimal EndingBalance { get; init; }

    [JsonPropertyName("debts")]
    public IReadOnlyList<DebtStrategyMonthDebtResponseDto> Debts { get; init; } = [];
}

public sealed class DebtStrategyMonthDebtResponseDto
{
    [JsonPropertyName("clientDebtId")]
    public string ClientDebtId { get; init; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; init; } = string.Empty;

    [JsonPropertyName("startingBalance")]
    public decimal StartingBalance { get; init; }

    [JsonPropertyName("interestCharged")]
    public decimal InterestCharged { get; init; }

    [JsonPropertyName("paymentApplied")]
    public decimal PaymentApplied { get; init; }

    [JsonPropertyName("minimumPaymentApplied")]
    public decimal MinimumPaymentApplied { get; init; }

    [JsonPropertyName("extraPaymentApplied")]
    public decimal ExtraPaymentApplied { get; init; }

    [JsonPropertyName("endingBalance")]
    public decimal EndingBalance { get; init; }

    [JsonPropertyName("isTargeted")]
    public bool IsTargeted { get; init; }

    [JsonPropertyName("isPaidOffThisMonth")]
    public bool IsPaidOffThisMonth { get; init; }
}
