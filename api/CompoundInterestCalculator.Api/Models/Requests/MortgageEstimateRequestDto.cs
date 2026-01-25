using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace CompoundInterestCalculator.Api.Models.Requests;

public sealed class MortgageEstimateRequestDto
{
    [Required]
    [Range(typeof(decimal), "0.01", "1000000000")]
    [JsonPropertyName("homePrice")]
    public decimal HomePrice { get; init; }

    [Required]
    [Range(typeof(decimal), "0", "1000000000")]
    [JsonPropertyName("downPaymentValue")]
    public decimal DownPaymentValue { get; init; }

    [Required]
    [JsonPropertyName("downPaymentType")]
    public string DownPaymentType { get; init; } = "Amount";

    [Required]
    [Range(typeof(decimal), "0", "100")]
    [JsonPropertyName("annualRatePercent")]
    public decimal AnnualRatePercent { get; init; }

    [Required]
    [Range(1, 40)]
    [JsonPropertyName("termYears")]
    public int TermYears { get; init; }

    [JsonPropertyName("propertyTaxType")]
    public string? PropertyTaxType { get; init; }

    [Range(typeof(decimal), "0", "1000000000")]
    [JsonPropertyName("propertyTaxValue")]
    public decimal? PropertyTaxValue { get; init; }

    [JsonPropertyName("pmiType")]
    public string? PmiType { get; init; }

    [Range(typeof(decimal), "0", "1000000000")]
    [JsonPropertyName("pmiValue")]
    public decimal? PmiValue { get; init; }

    [StringLength(64)]
    [JsonPropertyName("clientReference")]
    public string? ClientReference { get; init; }

    [JsonPropertyName("requestedAt")]
    public DateTimeOffset? RequestedAt { get; init; }
}
