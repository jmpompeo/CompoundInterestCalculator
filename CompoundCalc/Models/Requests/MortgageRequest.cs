using System.ComponentModel.DataAnnotations;

namespace CompoundCalc.Models.Requests;

public sealed class MortgageRequest
{
    public MortgageRequest(
        decimal homePrice,
        decimal downPayment,
        decimal annualRatePercent,
        int termYears,
        decimal? annualPropertyTax,
        decimal? annualPmi)
    {
        HomePrice = homePrice;
        DownPayment = downPayment;
        AnnualRatePercent = annualRatePercent;
        TermYears = termYears;
        AnnualPropertyTax = annualPropertyTax;
        AnnualPmi = annualPmi;

        Validate();
    }

    [Required]
    public decimal HomePrice { get; }

    [Required]
    public decimal DownPayment { get; }

    [Required]
    public decimal AnnualRatePercent { get; }

    [Required]
    public int TermYears { get; }

    public decimal? AnnualPropertyTax { get; }

    public decimal? AnnualPmi { get; }

    private void Validate()
    {
        if (HomePrice <= 0m)
        {
            throw new ArgumentOutOfRangeException(nameof(HomePrice), "Home price must be greater than zero.");
        }

        if (DownPayment < 0m)
        {
            throw new ArgumentOutOfRangeException(nameof(DownPayment), "Down payment cannot be negative.");
        }

        if (DownPayment > HomePrice)
        {
            throw new ArgumentOutOfRangeException(nameof(DownPayment), "Down payment cannot exceed the home price.");
        }

        if (AnnualRatePercent < 0m || AnnualRatePercent > 100m)
        {
            throw new ArgumentOutOfRangeException(nameof(AnnualRatePercent), "Annual rate percent must be between 0 and 100.");
        }

        if (TermYears is < 1 or > 40)
        {
            throw new ArgumentOutOfRangeException(nameof(TermYears), "Term years must be between 1 and 40.");
        }

        if (AnnualPropertyTax is < 0m)
        {
            throw new ArgumentOutOfRangeException(nameof(AnnualPropertyTax), "Annual property tax cannot be negative.");
        }

        if (AnnualPmi is < 0m)
        {
            throw new ArgumentOutOfRangeException(nameof(AnnualPmi), "Annual PMI cannot be negative.");
        }
    }
}
