using System;

namespace CompoundCalc.Helpers;

public static class DebtPayoffMath
{
    public static decimal CalculateMinimumPaymentRequired(decimal totalDebt, decimal monthlyRatePercent)
    {
        if (totalDebt <= 0m)
        {
            throw new ArgumentOutOfRangeException(nameof(totalDebt), "Total debt must be greater than zero.");
        }

        if (monthlyRatePercent < 0m || monthlyRatePercent > 100m)
        {
            throw new ArgumentOutOfRangeException(nameof(monthlyRatePercent), "Monthly APR percent must be between 0 and 100.");
        }

        var monthlyRate = Conversions.ConvertPercentageToDecimal(monthlyRatePercent);
        if (monthlyRate <= 0m)
        {
            return 0.01m;
        }

        var firstMonthInterest = decimal.Round(totalDebt * monthlyRate, 2, MidpointRounding.ToEven);
        return firstMonthInterest + 0.01m;
    }
}
