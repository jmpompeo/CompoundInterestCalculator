using CompoundCalc.Helpers;
using System.ComponentModel.DataAnnotations;

namespace CompoundCalc.Models.Requests;

public sealed class SavingsCalcReq
{
    public SavingsCalcReq(
        decimal startingBalance,
        decimal interestRate,
        int years,
        string compoundingCadence = "Monthly")
    {
        StartingBalance = startingBalance;
        InterestRate = interestRate;
        Years = years;
        CompoundingCadence = CompoundingCadenceOptions.NormalizeName(compoundingCadence);

        Validate();
    }

    [Required]
    public decimal StartingBalance { get; }

    [Required]
    public decimal InterestRate { get; }

    [Required]
    public int Years { get; }

    [Required]
    public string CompoundingCadence { get; }

    private void Validate()
    {
        if (StartingBalance < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(StartingBalance), "Starting balance must be non-negative.");
        }

        if (InterestRate < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(InterestRate), "Interest rate must be non-negative.");
        }

        if (Years < 0 || Years >= 100)
        {
            throw new ArgumentOutOfRangeException(nameof(Years), "Years must be between 0 and 99.");
        }

        if (!CompoundingCadenceOptions.IsSupported(CompoundingCadence))
        {
            throw new ArgumentException("Unsupported compounding cadence.", nameof(CompoundingCadence));
        }
    }
}
