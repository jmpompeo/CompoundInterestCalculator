using CompoundCalc.Helpers;
using CompoundCalc.Models.Requests;
using CompoundCalc.Models.Responses;
using CompoundCalc.Services.Contracts;

namespace CompoundCalc.Services;

public sealed class CalculationService : ICalculationService
{
    private const string DefaultCalculationVersion = "v1.0";

    public CalculationResult CalculateContributionGrowth(InterestCalcReq request)
    {
        ArgumentNullException.ThrowIfNull(request);
        return RunCalculation(
            request.StartingBalance,
            request.InterestRate,
            request.Years,
            request.CompoundingCadence,
            request.MonthlyContribution);
    }

    public CalculationResult CalculateSavingsGrowth(SavingsCalcReq request)
    {
        ArgumentNullException.ThrowIfNull(request);
        return RunCalculation(
            request.StartingBalance,
            request.InterestRate,
            request.Years,
            request.CompoundingCadence,
            monthlyContribution: 0m);
    }

    private static CalculationResult RunCalculation(
        decimal principal,
        decimal annualRatePercent,
        int years,
        string cadenceName,
        decimal monthlyContribution)
    {
        var periodsPerYear = CompoundingCadenceOptions.GetPeriodsPerYear(cadenceName);
        var annualRate = Conversions.ConvertPercentageToDecimal(annualRatePercent);
        var ratePerPeriod = decimal.Divide(annualRate, periodsPerYear);
        var totalMonths = years * 12;
        var monthsPerCompoundingPeriod = CalculateMonthsPerCompoundingPeriod(periodsPerYear);

        var balance = principal;
        for (var month = 1; month <= totalMonths; month++)
        {
            balance += monthlyContribution;

            if (month % monthsPerCompoundingPeriod == 0)
            {
                balance += balance * ratePerPeriod;
            }
        }

        return CalculationResult.Create(
            startingPrincipal: principal,
            annualRatePercent: annualRatePercent,
            compoundingCadence: cadenceName,
            durationYears: years,
            monthlyContribution: monthlyContribution,
            endingBalance: balance,
            currencyFormatter: Conversions.ConvertDecimalToCurrency,
            calculationVersion: DefaultCalculationVersion);
    }

    private static int CalculateMonthsPerCompoundingPeriod(int periodsPerYear)
    {
        if (periodsPerYear <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(periodsPerYear), "Periods per year must be positive.");
        }

        const int MonthsInYear = 12;
        if (MonthsInYear % periodsPerYear != 0)
        {
            throw new InvalidOperationException(
                $"Unsupported compounding cadence with {periodsPerYear} periods per year.");
        }

        return MonthsInYear / periodsPerYear;
    }
}
