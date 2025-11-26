using CompoundCalc.Helpers;
using CompoundCalc.Models.Requests;
using CompoundCalc.Services;

namespace CompoundInterestCalculatorTests.Services;

public class CalculationServiceTests
{
    private readonly CalculationService _service = new();

    [Fact]
    public void CalculateCompoundInterest_ComputesExpectedBalanceWithCurrencyDisplay()
    {
        var request = new InterestCalcReq(10000m, 5.5m, 10);

        var result = _service.CalculateCompoundInterest(request);

        var expected = ComputeExpectedBalance(10000m, 5.5m, 10, "Annual");

        Assert.Equal(expected, result.EndingBalance);
        Assert.Equal("$17,081.44", result.CurrencyDisplay);
        Assert.Equal(10000m, result.StartingPrincipal);
        Assert.Equal("v1.0", result.CalculationVersion);
    }

    [Fact]
    public void CalculateCompoundInterest_DoesNotMutateRequest()
    {
        var request = new InterestCalcReq(2500m, 7.25m, 3);
        var originalPrincipal = request.StartingBalance;

        _ = _service.CalculateCompoundInterest(request);

        Assert.Equal(originalPrincipal, request.StartingBalance);
    }

    [Fact]
    public void CalculateCompoundInterest_WhenDurationIsZero_ReturnsPrincipal()
    {
        var request = new InterestCalcReq(2500m, 7.25m, 0);

        var result = _service.CalculateCompoundInterest(request);

        Assert.Equal(2500m, result.EndingBalance);
        Assert.Equal("$2,500.00", result.CurrencyDisplay);
    }

    [Theory]
    [InlineData("SemiAnnual", 5000, 4.5, 5)]
    [InlineData("Quarterly", 3200, 6.25, 3)]
    [InlineData("Monthly", 1000, 5.0, 1)]
    public void CalculateCompoundInterest_UsesCompoundingCadence(
        string cadence,
        decimal principal,
        decimal annualRatePercent,
        int durationYears)
    {
        var request = new InterestCalcReq(principal, annualRatePercent, durationYears, cadence);

        var result = _service.CalculateCompoundInterest(request);

        var expected = ComputeExpectedBalance(principal, annualRatePercent, durationYears, cadence);

        Assert.Equal(expected, result.EndingBalance);
        Assert.Equal(cadence, result.CompoundingCadence);
    }

    private static decimal ComputeExpectedBalance(decimal principal, decimal annualRatePercent, int years, string cadence)
    {
        var periodsPerYear = CompoundingCadenceOptions.GetPeriodsPerYear(cadence);
        var rate = decimal.Divide(annualRatePercent, 100m * periodsPerYear);
        var balance = principal;
        var totalPeriods = years * periodsPerYear;
        for (var i = 0; i < totalPeriods; i++)
        {
            balance += balance * rate;
        }

        return Math.Round(balance, 2, MidpointRounding.ToEven);
    }
}
