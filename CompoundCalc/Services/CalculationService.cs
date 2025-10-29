using CompoundCalc.Helpers;
using CompoundCalc.Models.Requests;
using CompoundCalc.Models.Responses;
using CompoundCalc.Services.Contracts;

namespace CompoundCalc.Services;

public sealed class CalculationService : ICalculationService
{
    private const string DefaultCalculationVersion = "v1.0";
    private const string DefaultCompoundingCadence = "Annual";

    public CalculationResult CalculateCompoundInterest(InterestCalcReq request)
    {
        ArgumentNullException.ThrowIfNull(request);

        var principal = request.StartingBalance;
        var ratePerPeriod = Conversions.ConvertPercentageToDecimal(request.InterestRate);
        var totalPeriods = request.Years;

        var balance = principal;
        for (var period = 0; period < totalPeriods; period++)
        {
            balance += balance * ratePerPeriod;
        }

        return CalculationResult.Create(
            startingPrincipal: principal,
            annualRatePercent: request.InterestRate,
            compoundingCadence: DefaultCompoundingCadence,
            durationYears: request.Years,
            endingBalance: balance,
            currencyFormatter: Conversions.ConvertDecimalToCurrency,
            calculationVersion: DefaultCalculationVersion);
    }
}
