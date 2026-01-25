using CompoundInterestCalculator.Api.Models.Requests;
using FluentValidation;

namespace CompoundInterestCalculator.Api.Validation;

public sealed class MortgageEstimateRequestValidator : AbstractValidator<MortgageEstimateRequestDto>
{
    public MortgageEstimateRequestValidator()
    {
        RuleFor(x => x.HomePrice)
            .InclusiveBetween(0.01m, 1_000_000_000m);

        RuleFor(x => x.DownPaymentType)
            .NotEmpty()
            .Must(IsSupportedDownPaymentType)
            .WithMessage("Down payment type must be Amount or Percent.");

        RuleFor(x => x.DownPaymentValue)
            .InclusiveBetween(0m, 1_000_000_000m);

        RuleFor(x => x.DownPaymentValue)
            .InclusiveBetween(0m, 100m)
            .When(x => IsPercentDownPayment(x.DownPaymentType))
            .WithMessage("Down payment percent must be between 0 and 100.");

        RuleFor(x => x.DownPaymentValue)
            .Must((request, downPaymentValue) =>
            {
                var downPaymentAmount = IsPercentDownPayment(request.DownPaymentType)
                    ? request.HomePrice * (downPaymentValue / 100m)
                    : downPaymentValue;

                return downPaymentAmount <= request.HomePrice;
            })
            .WithMessage("Down payment cannot exceed the home price.");

        RuleFor(x => x.AnnualRatePercent)
            .InclusiveBetween(0m, 100m);

        RuleFor(x => x.TermYears)
            .InclusiveBetween(1, 40);

        RuleFor(x => x.ClientReference)
            .MaximumLength(64);

        RuleFor(x => x.PropertyTaxType)
            .Must(type => string.IsNullOrWhiteSpace(type) || IsSupportedTaxType(type))
            .WithMessage("Property tax type must be Amount or Percent.");

        RuleFor(x => x.PropertyTaxValue)
            .InclusiveBetween(0m, 1_000_000_000m)
            .When(x => x.PropertyTaxValue.HasValue);

        RuleFor(x => x.PropertyTaxValue)
            .InclusiveBetween(0m, 100m)
            .When(x => IsPercentTaxType(x.PropertyTaxType))
            .WithMessage("Property tax percent must be between 0 and 100.");

        RuleFor(x => x)
            .Must(request => IsTaxPairValid(request.PropertyTaxType, request.PropertyTaxValue))
            .WithMessage("Property tax type and value must be provided together.");

        RuleFor(x => x.PmiType)
            .Must(type => string.IsNullOrWhiteSpace(type) || IsSupportedPmiType(type))
            .WithMessage("PMI type must be Amount or Percent.");

        RuleFor(x => x.PmiValue)
            .InclusiveBetween(0m, 1_000_000_000m)
            .When(x => x.PmiValue.HasValue);

        RuleFor(x => x.PmiValue)
            .InclusiveBetween(0m, 100m)
            .When(x => IsPercentPmiType(x.PmiType))
            .WithMessage("PMI percent must be between 0 and 100.");

        RuleFor(x => x)
            .Must(request => IsPmiPairValid(request.PmiType, request.PmiValue))
            .WithMessage("PMI type and value must be provided together.");
    }

    private static bool IsSupportedDownPaymentType(string? type)
        => string.Equals(type?.Trim(), "Amount", StringComparison.OrdinalIgnoreCase)
            || string.Equals(type?.Trim(), "Percent", StringComparison.OrdinalIgnoreCase);

    private static bool IsPercentDownPayment(string? type)
        => string.Equals(type?.Trim(), "Percent", StringComparison.OrdinalIgnoreCase);

    private static bool IsSupportedTaxType(string type)
        => string.Equals(type?.Trim(), "Amount", StringComparison.OrdinalIgnoreCase)
            || string.Equals(type?.Trim(), "Percent", StringComparison.OrdinalIgnoreCase);

    private static bool IsPercentTaxType(string? type)
        => string.Equals(type?.Trim(), "Percent", StringComparison.OrdinalIgnoreCase);

    private static bool IsTaxPairValid(string? type, decimal? value)
        => string.IsNullOrWhiteSpace(type) == !value.HasValue;

    private static bool IsSupportedPmiType(string type)
        => string.Equals(type?.Trim(), "Amount", StringComparison.OrdinalIgnoreCase)
            || string.Equals(type?.Trim(), "Percent", StringComparison.OrdinalIgnoreCase);

    private static bool IsPercentPmiType(string? type)
        => string.Equals(type?.Trim(), "Percent", StringComparison.OrdinalIgnoreCase);

    private static bool IsPmiPairValid(string? type, decimal? value)
        => string.IsNullOrWhiteSpace(type) == !value.HasValue;
}
