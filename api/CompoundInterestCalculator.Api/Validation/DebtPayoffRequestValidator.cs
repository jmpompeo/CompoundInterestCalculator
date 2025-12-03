using System.Globalization;
using CompoundCalc.Helpers;
using CompoundInterestCalculator.Api.Models.Requests;
using FluentValidation;

namespace CompoundInterestCalculator.Api.Validation;

public sealed class DebtPayoffRequestValidator : AbstractValidator<DebtPayoffRequestDto>
{
    public DebtPayoffRequestValidator()
    {
        RuleFor(x => x.TotalDebt)
            .GreaterThan(0m)
            .LessThanOrEqualTo(1_000_000_000m);

        RuleFor(x => x.MonthlyPayment)
            .GreaterThan(0m)
            .LessThanOrEqualTo(1_000_000_000m);

        RuleFor(x => x.MonthlyRatePercent)
            .InclusiveBetween(0m, 100m);

        RuleFor(x => x.ClientReference)
            .MaximumLength(64);

        RuleFor(x => x.MonthlyPayment)
            .Must((request, payment) =>
            {
                if (request.MonthlyRatePercent <= 0m)
                {
                    return payment > 0m;
                }

                var minimumPayment = DebtPayoffMath.CalculateMinimumPaymentRequired(request.TotalDebt, request.MonthlyRatePercent);
                return payment >= minimumPayment;
            })
            .WithMessage(request =>
            {
                var minimum = DebtPayoffMath.CalculateMinimumPaymentRequired(request.TotalDebt, request.MonthlyRatePercent);
                return $"Monthly payment must be at least {minimum.ToString("C", CultureInfo.GetCultureInfo("en-US"))} to reduce the balance.";
            })
            .When(x => x.TotalDebt > 0m && x.MonthlyRatePercent > 0m);
    }
}
