using CompoundInterestCalculator.Api.Models.Requests;
using FluentValidation;

namespace CompoundInterestCalculator.Api.Validation;

public sealed class CarLoanEstimateRequestValidator : AbstractValidator<CarLoanEstimateRequestDto>
{
    public CarLoanEstimateRequestValidator()
    {
        RuleFor(x => x.VehiclePrice)
            .InclusiveBetween(0.01m, 1_000_000_000m);

        RuleFor(x => x.CashDownPayment)
            .InclusiveBetween(0m, 1_000_000_000m);

        RuleFor(x => x.TradeInValue)
            .InclusiveBetween(0m, 1_000_000_000m);

        RuleFor(x => x.TradeInPayoff)
            .InclusiveBetween(0m, 1_000_000_000m);

        RuleFor(x => x.AnnualRatePercent)
            .InclusiveBetween(0m, 100m);

        RuleFor(x => x.TermMonths)
            .InclusiveBetween(1, 96);

        RuleFor(x => x.Fees)
            .InclusiveBetween(0m, 1_000_000_000m);

        RuleFor(x => x.Rebate)
            .InclusiveBetween(0m, 1_000_000_000m);

        RuleFor(x => x.FinancedExtras)
            .InclusiveBetween(0m, 1_000_000_000m);

        RuleFor(x => x.SalesTaxPercent)
            .InclusiveBetween(0m, 100m)
            .When(x => x.SalesTaxPercent.HasValue)
            .WithMessage("Sales tax percent must be between 0 and 100.");

        RuleFor(x => x.SalesTaxAmount)
            .InclusiveBetween(0m, 1_000_000_000m)
            .When(x => x.SalesTaxAmount.HasValue)
            .WithMessage("Sales tax amount must be non-negative.");

        RuleFor(x => x)
            .Must(request => request.SalesTaxPercent.HasValue ^ request.SalesTaxAmount.HasValue)
            .WithMessage("Provide either salesTaxPercent or salesTaxAmount.");

        RuleFor(x => x.ClientReference)
            .MaximumLength(64);
    }
}
