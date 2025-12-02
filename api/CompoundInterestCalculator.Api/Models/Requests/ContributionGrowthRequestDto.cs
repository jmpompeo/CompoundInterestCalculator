using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace CompoundInterestCalculator.Api.Models.Requests;

public sealed class ContributionGrowthRequestDto
{
    [Required]
    [JsonPropertyName("principal")]
    public decimal Principal { get; init; }

    [Required]
    [Range(typeof(decimal), "0", "100")]
    [JsonPropertyName("annualRatePercent")]
    public decimal AnnualRatePercent { get; init; }

    [Required]
    [RegularExpression("^(Annual|SemiAnnual|Quarterly|Monthly)$", ErrorMessage = "Compounding cadence is not supported.")]
    [JsonPropertyName("compoundingCadence")]
    public string CompoundingCadence { get; init; } = "Annual";

    [Required]
    [Range(0, 99)]
    [JsonPropertyName("durationYears")]
    public int DurationYears { get; init; }

    [Required]
    [JsonPropertyName("monthlyContribution")]
    public decimal MonthlyContribution { get; init; }

    [StringLength(64)]
    [JsonPropertyName("clientReference")]
    public string? ClientReference { get; init; }

    [JsonPropertyName("requestedAt")]
    public DateTimeOffset? RequestedAt { get; init; }
}
