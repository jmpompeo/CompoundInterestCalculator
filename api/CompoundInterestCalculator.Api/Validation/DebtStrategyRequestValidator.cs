using CompoundCalc.Helpers;
using CompoundInterestCalculator.Api.Models.Requests;
using FluentValidation;

namespace CompoundInterestCalculator.Api.Validation;

public sealed class DebtStrategyRequestValidator : AbstractValidator<DebtStrategyRequestDto>
{
    public DebtStrategyRequestValidator()
    {
        RuleFor(x => x.MonthlyBudget)
            .GreaterThan(0m)
            .LessThanOrEqualTo(1_000_000_000m);

        RuleFor(x => x.Debts)
            .NotNull()
            .Must(debts => debts is { Count: >= 1 and <= 50 })
            .WithMessage("Provide between 1 and 50 debts.");

        RuleForEach(x => x.Debts)
            .SetValidator(new DebtStrategyDebtRequestValidator());

        RuleFor(x => x.MonthlyBudget)
            .Must((request, monthlyBudget) => monthlyBudget >= request.Debts.Sum(debt => debt.MinimumPayment))
            .WithMessage("Monthly budget must be at least the total minimum payment.")
            .When(x => x.Debts is { Count: > 0 });

        RuleFor(x => x.MonthlyBudget)
            .Must((request, monthlyBudget) =>
            {
                var firstMonthInterest = request.Debts.Sum(debt =>
                {
                    if (debt.AnnualAprPercent <= 0m)
                    {
                        return 0m;
                    }

                    var monthlyRate = decimal.Divide(Conversions.ConvertPercentageToDecimal(debt.AnnualAprPercent), 12m);
                    return decimal.Round(debt.CurrentBalance * monthlyRate, 10, MidpointRounding.ToEven);
                });

                return firstMonthInterest <= 0m || monthlyBudget > firstMonthInterest;
            })
            .WithMessage("Monthly budget must exceed first-month aggregate interest.")
            .When(x => x.Debts is { Count: > 0 });

        RuleFor(x => x.ClientReference)
            .MaximumLength(64);
    }
}

public sealed class DebtStrategyDebtRequestValidator : AbstractValidator<DebtStrategyDebtRequestDto>
{
    public DebtStrategyDebtRequestValidator()
    {
        RuleFor(x => x.ClientDebtId)
            .NotEmpty()
            .MaximumLength(128);

        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(128);

        RuleFor(x => x.CurrentBalance)
            .GreaterThan(0m)
            .LessThanOrEqualTo(1_000_000_000m);

        RuleFor(x => x.AnnualAprPercent)
            .InclusiveBetween(0m, 100m);

        RuleFor(x => x.MinimumPayment)
            .GreaterThan(0m)
            .LessThanOrEqualTo(1_000_000_000m);
    }
}
