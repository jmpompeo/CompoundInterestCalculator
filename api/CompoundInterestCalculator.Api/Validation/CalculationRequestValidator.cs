using System.Linq;
using CompoundInterestCalculator.Api.Models.Requests;
using FluentValidation;

namespace CompoundInterestCalculator.Api.Validation;

public sealed class CalculationRequestValidator : AbstractValidator<CalculationRequestDto>
{
    private static readonly string[] SupportedCadences = { "Annual", "SemiAnnual", "Quarterly", "Monthly" };

    public CalculationRequestValidator()
    {
        RuleFor(x => x.Principal)
            .InclusiveBetween(0m, 10_000_000m);

        RuleFor(x => x.AnnualRatePercent)
            .InclusiveBetween(0m, 100m);

        RuleFor(x => x.CompoundingCadence)
            .NotEmpty()
            .Must(cadence => SupportedCadences.Contains(cadence))
            .WithMessage("Compounding cadence must be one of Annual, SemiAnnual, Quarterly, or Monthly.");

        RuleFor(x => x.DurationYears)
            .InclusiveBetween(0, 99);

        RuleFor(x => x.ClientReference)
            .MaximumLength(64);
    }
}
