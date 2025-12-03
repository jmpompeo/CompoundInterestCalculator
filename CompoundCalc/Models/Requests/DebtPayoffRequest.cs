using System.ComponentModel.DataAnnotations;

namespace CompoundCalc.Models.Requests;

public sealed class DebtPayoffRequest
{
    public DebtPayoffRequest(decimal totalDebt, decimal monthlyPayment, decimal monthlyRatePercent)
    {
        TotalDebt = totalDebt;
        MonthlyPayment = monthlyPayment;
        MonthlyRatePercent = monthlyRatePercent;

        Validate();
    }

    [Required]
    public decimal TotalDebt { get; }

    [Required]
    public decimal MonthlyPayment { get; }

    [Required]
    public decimal MonthlyRatePercent { get; }

    private void Validate()
    {
        if (TotalDebt <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(TotalDebt), "Total debt must be greater than zero.");
        }

        if (MonthlyPayment <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(MonthlyPayment), "Monthly payment must be greater than zero.");
        }

        if (MonthlyRatePercent < 0 || MonthlyRatePercent > 100)
        {
            throw new ArgumentOutOfRangeException(nameof(MonthlyRatePercent), "Monthly APR percent must be between 0 and 100.");
        }
    }
}
