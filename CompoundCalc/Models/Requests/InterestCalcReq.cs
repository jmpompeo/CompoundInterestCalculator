using CompoundCalc.Helpers;
using System.ComponentModel.DataAnnotations;
using Newtonsoft.Json;

namespace CompoundCalc.Models.Requests;

public class InterestCalcReq
{
    public InterestCalcReq(
        decimal startingBalance,
        decimal interestRate,
        int years,
        decimal monthlyContribution,
        string compoundingCadence = "Annual")
    {
        StartingBalance = startingBalance;
        InterestRate = interestRate;
        Years = years;
        MonthlyContribution = monthlyContribution;
        CompoundingCadence = CompoundingCadenceOptions.NormalizeName(compoundingCadence);

        ValidateParams();
    }

    [Required(ErrorMessage = "Starting balance is required")]
    public decimal StartingBalance { get; set; }

    [Required(ErrorMessage = "Interest rate is required")]
    public decimal InterestRate { get; set; }

    [Required(ErrorMessage = "Years is required")]
    public int Years { get; set; }

    [Required(ErrorMessage = "Compounding cadence is required")]
    public string CompoundingCadence { get; }

    public decimal MonthlyContribution { get; set; }

    public void ValidateParams()
    {
        if (StartingBalance < 0)
        {
            throw new ArgumentOutOfRangeException
                ("Negative numbers are not allowed.");
        }
        if (InterestRate < 0)
        {
            throw new ArgumentOutOfRangeException
                ("Negative numbers are not allowed.");
        }
        if (Years < 0 || Years >= 100)
        {
            throw new ArgumentOutOfRangeException
                ("The number of years needs to be between 0-100");
        }

        if (!CompoundingCadenceOptions.IsSupported(CompoundingCadence))
        {
            throw new ArgumentException("Unsupported compounding cadence.");
        }

        if (MonthlyContribution < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(MonthlyContribution), "Monthly contribution cannot be negative.");
        }
    }
}
