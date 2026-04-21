using System.ComponentModel.DataAnnotations;

namespace CompoundCalc.Models.Requests;

public sealed class CarLoanRequest
{
    public CarLoanRequest(
        decimal vehiclePrice,
        decimal cashDownPayment,
        decimal tradeInValue,
        decimal tradeInPayoff,
        decimal annualRatePercent,
        int termMonths,
        decimal? salesTaxPercent,
        decimal? salesTaxAmount,
        decimal fees,
        decimal rebate,
        decimal financedExtras)
    {
        VehiclePrice = vehiclePrice;
        CashDownPayment = cashDownPayment;
        TradeInValue = tradeInValue;
        TradeInPayoff = tradeInPayoff;
        AnnualRatePercent = annualRatePercent;
        TermMonths = termMonths;
        SalesTaxPercent = salesTaxPercent;
        SalesTaxAmount = salesTaxAmount;
        Fees = fees;
        Rebate = rebate;
        FinancedExtras = financedExtras;

        Validate();
    }

    [Required] public decimal VehiclePrice { get; }
    [Required] public decimal CashDownPayment { get; }
    [Required] public decimal TradeInValue { get; }
    [Required] public decimal TradeInPayoff { get; }
    [Required] public decimal AnnualRatePercent { get; }
    [Required] public int TermMonths { get; }
    public decimal? SalesTaxPercent { get; }
    public decimal? SalesTaxAmount { get; }
    public decimal Fees { get; }
    public decimal Rebate { get; }
    public decimal FinancedExtras { get; }

    private void Validate()
    {
        if (VehiclePrice <= 0m)
        {
            throw new ArgumentOutOfRangeException(nameof(VehiclePrice), "Vehicle price must be greater than zero.");
        }

        if (CashDownPayment < 0m)
        {
            throw new ArgumentOutOfRangeException(nameof(CashDownPayment), "Cash down payment cannot be negative.");
        }

        if (TradeInValue < 0m)
        {
            throw new ArgumentOutOfRangeException(nameof(TradeInValue), "Trade-in value cannot be negative.");
        }

        if (TradeInPayoff < 0m)
        {
            throw new ArgumentOutOfRangeException(nameof(TradeInPayoff), "Trade-in payoff cannot be negative.");
        }

        if (AnnualRatePercent < 0m || AnnualRatePercent > 100m)
        {
            throw new ArgumentOutOfRangeException(nameof(AnnualRatePercent), "Annual rate percent must be between 0 and 100.");
        }

        if (TermMonths is < 1 or > 96)
        {
            throw new ArgumentOutOfRangeException(nameof(TermMonths), "Term months must be between 1 and 96.");
        }

        if (SalesTaxPercent is < 0m or > 100m)
        {
            throw new ArgumentOutOfRangeException(nameof(SalesTaxPercent), "Sales tax percent must be between 0 and 100.");
        }

        if (SalesTaxAmount is < 0m)
        {
            throw new ArgumentOutOfRangeException(nameof(SalesTaxAmount), "Sales tax amount cannot be negative.");
        }

        if (Fees < 0m)
        {
            throw new ArgumentOutOfRangeException(nameof(Fees), "Fees cannot be negative.");
        }

        if (Rebate < 0m)
        {
            throw new ArgumentOutOfRangeException(nameof(Rebate), "Rebate cannot be negative.");
        }

        if (FinancedExtras < 0m)
        {
            throw new ArgumentOutOfRangeException(nameof(FinancedExtras), "Financed extras cannot be negative.");
        }

        if ((SalesTaxPercent.HasValue && SalesTaxAmount.HasValue) || (!SalesTaxPercent.HasValue && !SalesTaxAmount.HasValue))
        {
            throw new ArgumentException("Provide either sales tax percent or sales tax amount.");
        }
    }
}
