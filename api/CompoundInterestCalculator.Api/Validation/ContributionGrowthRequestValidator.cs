using CompoundCalc.Helpers;
using CompoundInterestCalculator.Api.Models.Requests;
using FluentValidation;

namespace CompoundInterestCalculator.Api.Validation;

public sealed class ContributionGrowthRequestValidator : AbstractValidator<ContributionGrowthRequestDto>
{
    public ContributionGrowthRequestValidator()
    {
        RuleFor(x => x.Principal)
            .InclusiveBetween(0m, 1_000_000_000m);

        RuleFor(x => x.AnnualRatePercent)
            .InclusiveBetween(0m, 100m);

        RuleFor(x => x.CompoundingCadence)
            .NotEmpty()
            .Must(CompoundingCadenceOptions.IsSupported)
            .WithMessage($"Compounding cadence must be one of {string.Join(", ", CompoundingCadenceOptions.SupportedCadences)}.");

        RuleFor(x => x.DurationYears)
            .InclusiveBetween(0, 99);

        RuleFor(x => x.ClientReference)
            .MaximumLength(64);
        
        RuleFor(x => x.MonthlyContribution)
            .InclusiveBetween(0m, 1_000_000_000m);
    }
}
