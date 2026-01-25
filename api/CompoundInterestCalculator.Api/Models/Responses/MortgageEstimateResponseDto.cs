using System.Text.Json.Serialization;

namespace CompoundInterestCalculator.Api.Models.Responses;

public sealed class MortgageEstimateResponseDto
{
    [JsonPropertyName("homePrice")]
    public decimal HomePrice { get; init; }

    [JsonPropertyName("downPayment")]
    public decimal DownPayment { get; init; }

    [JsonPropertyName("loanAmount")]
    public decimal LoanAmount { get; init; }

    [JsonPropertyName("annualRatePercent")]
    public decimal AnnualRatePercent { get; init; }

    [JsonPropertyName("termYears")]
    public int TermYears { get; init; }

    [JsonPropertyName("monthlyPayment")]
    public decimal MonthlyPrincipalAndInterest { get; init; }

    [JsonPropertyName("monthlyPropertyTax")]
    public decimal MonthlyPropertyTax { get; init; }

    [JsonPropertyName("monthlyPmi")]
    public decimal MonthlyPmi { get; init; }

    [JsonPropertyName("monthlyTotalPayment")]
    public decimal MonthlyTotalPayment { get; init; }

    [JsonPropertyName("totalPaid")]
    public decimal TotalPaid { get; init; }

    [JsonPropertyName("totalInterest")]
    public decimal TotalInterest { get; init; }

    [JsonPropertyName("loanAmountDisplay")]
    public string LoanAmountDisplay { get; init; } = string.Empty;

    [JsonPropertyName("monthlyPrincipalAndInterestDisplay")]
    public string MonthlyPrincipalAndInterestDisplay { get; init; } = string.Empty;

    [JsonPropertyName("monthlyPropertyTaxDisplay")]
    public string MonthlyPropertyTaxDisplay { get; init; } = string.Empty;

    [JsonPropertyName("monthlyPmiDisplay")]
    public string MonthlyPmiDisplay { get; init; } = string.Empty;

    [JsonPropertyName("monthlyTotalPaymentDisplay")]
    public string MonthlyTotalPaymentDisplay { get; init; } = string.Empty;

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
