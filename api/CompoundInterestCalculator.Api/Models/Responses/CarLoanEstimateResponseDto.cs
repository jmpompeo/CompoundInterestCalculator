using System.Text.Json.Serialization;

namespace CompoundInterestCalculator.Api.Models.Responses;

public sealed class CarLoanAmortizationEntryDto
{
    [JsonPropertyName("month")]
    public int Month { get; init; }

    [JsonPropertyName("payment")]
    public decimal Payment { get; init; }

    [JsonPropertyName("principal")]
    public decimal Principal { get; init; }

    [JsonPropertyName("interest")]
    public decimal Interest { get; init; }

    [JsonPropertyName("remainingBalance")]
    public decimal RemainingBalance { get; init; }
}

public sealed class CarLoanEstimateResponseDto
{
    [JsonPropertyName("vehiclePrice")]
    public decimal VehiclePrice { get; init; }

    [JsonPropertyName("cashDownPayment")]
    public decimal CashDownPayment { get; init; }

    [JsonPropertyName("tradeInValue")]
    public decimal TradeInValue { get; init; }

    [JsonPropertyName("tradeInPayoff")]
    public decimal TradeInPayoff { get; init; }

    [JsonPropertyName("netTradeInCredit")]
    public decimal NetTradeInCredit { get; init; }

    [JsonPropertyName("totalUpfrontCredit")]
    public decimal TotalUpfrontCredit { get; init; }

    [JsonPropertyName("salesTax")]
    public decimal SalesTax { get; init; }

    [JsonPropertyName("fees")]
    public decimal Fees { get; init; }

    [JsonPropertyName("rebate")]
    public decimal Rebate { get; init; }

    [JsonPropertyName("financedExtras")]
    public decimal FinancedExtras { get; init; }

    [JsonPropertyName("amountFinanced")]
    public decimal AmountFinanced { get; init; }

    [JsonPropertyName("annualRatePercent")]
    public decimal AnnualRatePercent { get; init; }

    [JsonPropertyName("termMonths")]
    public int TermMonths { get; init; }

    [JsonPropertyName("monthlyPayment")]
    public decimal MonthlyPayment { get; init; }

    [JsonPropertyName("totalPaid")]
    public decimal TotalPaid { get; init; }

    [JsonPropertyName("totalInterest")]
    public decimal TotalInterest { get; init; }

    [JsonPropertyName("amountFinancedDisplay")]
    public string AmountFinancedDisplay { get; init; } = string.Empty;

    [JsonPropertyName("monthlyPaymentDisplay")]
    public string MonthlyPaymentDisplay { get; init; } = string.Empty;

    [JsonPropertyName("totalPaidDisplay")]
    public string TotalPaidDisplay { get; init; } = string.Empty;

    [JsonPropertyName("totalInterestDisplay")]
    public string TotalInterestDisplay { get; init; } = string.Empty;

    [JsonPropertyName("totalUpfrontCreditDisplay")]
    public string TotalUpfrontCreditDisplay { get; init; } = string.Empty;

    [JsonPropertyName("netTradeInCreditDisplay")]
    public string NetTradeInCreditDisplay { get; init; } = string.Empty;

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

    [JsonPropertyName("amortizationSchedule")]
    public IReadOnlyList<CarLoanAmortizationEntryDto> AmortizationSchedule { get; init; } = [];
}
