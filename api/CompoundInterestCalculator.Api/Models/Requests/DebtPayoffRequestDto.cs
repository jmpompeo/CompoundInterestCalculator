using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace CompoundInterestCalculator.Api.Models.Requests;

public sealed class DebtPayoffRequestDto
{
    [Required]
    [Range(typeof(decimal), "0.01", "1000000000")]
    [JsonPropertyName("totalDebt")]
    public decimal TotalDebt { get; init; }

    [Required]
    [Range(typeof(decimal), "0.01", "1000000000")]
    [JsonPropertyName("monthlyPayment")]
    public decimal MonthlyPayment { get; init; }

    [Required]
    [Range(typeof(decimal), "0", "100")]
    [JsonPropertyName("monthlyRatePercent")]
    public decimal MonthlyRatePercent { get; init; }

    [StringLength(64)]
    [JsonPropertyName("clientReference")]
    public string? ClientReference { get; init; }

    [JsonPropertyName("requestedAt")]
    public DateTimeOffset? RequestedAt { get; init; }
}
