using System.ComponentModel.DataAnnotations;

namespace CompoundInterestCalculator.Api.Models.Requests;

public sealed class CalculationRequestDto
{
    [Required]
    [Range(typeof(decimal), "0", "10000000")]
    public decimal Principal { get; init; }

    [Required]
    [Range(typeof(decimal), "0", "100")]
    public decimal AnnualRatePercent { get; init; }

    [Required]
    [RegularExpression("^(Annual|SemiAnnual|Quarterly|Monthly)$", ErrorMessage = "Compounding cadence is not supported.")]
    public string CompoundingCadence { get; init; } = "Annual";

    [Required]
    [Range(0, 99)]
    public int DurationYears { get; init; }

    [StringLength(64)]
    public string? ClientReference { get; init; }

    public DateTimeOffset? RequestedAt { get; init; }
}
