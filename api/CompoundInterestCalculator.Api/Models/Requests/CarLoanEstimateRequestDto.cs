using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace CompoundInterestCalculator.Api.Models.Requests;

public sealed class CarLoanEstimateRequestDto
{
    [Required]
    [Range(typeof(decimal), "0.01", "1000000000")]
    [JsonPropertyName("vehiclePrice")]
    public decimal VehiclePrice { get; init; }

    [Range(typeof(decimal), "0", "1000000000")]
    [JsonPropertyName("cashDownPayment")]
    public decimal CashDownPayment { get; init; }

    [Range(typeof(decimal), "0", "1000000000")]
    [JsonPropertyName("tradeInValue")]
    public decimal TradeInValue { get; init; }

    [Range(typeof(decimal), "0", "1000000000")]
    [JsonPropertyName("tradeInPayoff")]
    public decimal TradeInPayoff { get; init; }

    [Required]
    [Range(typeof(decimal), "0", "100")]
    [JsonPropertyName("annualRatePercent")]
    public decimal AnnualRatePercent { get; init; }

    [Required]
    [Range(1, 96)]
    [JsonPropertyName("termMonths")]
    public int TermMonths { get; init; }

    [JsonPropertyName("salesTaxPercent")]
    public decimal? SalesTaxPercent { get; init; }

    [JsonPropertyName("salesTaxAmount")]
    public decimal? SalesTaxAmount { get; init; }

    [Range(typeof(decimal), "0", "1000000000")]
    [JsonPropertyName("fees")]
    public decimal Fees { get; init; }

    [Range(typeof(decimal), "0", "1000000000")]
    [JsonPropertyName("rebate")]
    public decimal Rebate { get; init; }

    [Range(typeof(decimal), "0", "1000000000")]
    [JsonPropertyName("financedExtras")]
    public decimal FinancedExtras { get; init; }

    [StringLength(64)]
    [JsonPropertyName("clientReference")]
    public string? ClientReference { get; init; }

    [JsonPropertyName("requestedAt")]
    public DateTimeOffset? RequestedAt { get; init; }
}
