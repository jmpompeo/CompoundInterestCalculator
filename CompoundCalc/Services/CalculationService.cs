using CompoundCalc.Helpers;
using CompoundCalc.Models.Requests;
using CompoundCalc.Models.Responses;
using CompoundCalc.Services.Contracts;

namespace CompoundCalc.Services;

public sealed class CalculationService : ICalculationService
{
    private const string DefaultCalculationVersion = "v1.0";

    public CalculationResult CalculateCompoundInterest(InterestCalcReq request)
    {
        ArgumentNullException.ThrowIfNull(request);

        var principal = request.StartingBalance;
        var cadenceName = request.CompoundingCadence;
        var periodsPerYear = CompoundingCadenceOptions.GetPeriodsPerYear(cadenceName);
        var annualRate = Conversions.ConvertPercentageToDecimal(request.InterestRate);
        var ratePerPeriod = decimal.Divide(annualRate, periodsPerYear);
        var totalPeriods = request.Years * periodsPerYear;

        var balance = principal;
        for (var period = 0; period < totalPeriods; period++)
        {
            balance += balance * ratePerPeriod;
        }

        return CalculationResult.Create(
            startingPrincipal: principal,
            annualRatePercent: request.InterestRate,
            compoundingCadence: cadenceName,
            durationYears: request.Years,
            endingBalance: balance,
            currencyFormatter: Conversions.ConvertDecimalToCurrency,
            calculationVersion: DefaultCalculationVersion);
    }
}
