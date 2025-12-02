using CompoundCalc.Helpers;
using CompoundCalc.Models.Requests;
using CompoundCalc.Services;

namespace CompoundInterestCalculatorTests.Services;

public class CalculationServiceTests
{
    private readonly CalculationService _service = new();

    [Fact]
    public void CalculateContributionGrowth_ComputesExpectedBalanceWithCurrencyDisplay()
    {
        var request = new InterestCalcReq(10000m, 5.5m, 10, 10m);

        var result = _service.CalculateContributionGrowth(request);

        var expected = ComputeExpectedBalance(10000m, 5.5m, 10, 10m, "Annual");

        Assert.Equal(expected, result.EndingBalance);
        Assert.Equal(Conversions.ConvertDecimalToCurrency(expected), result.CurrencyDisplay);
        Assert.Equal(10000m, result.StartingPrincipal);
        Assert.Equal("v1.0", result.CalculationVersion);
    }

    [Fact]
    public void CalculateContributionGrowth_DoesNotMutateRequest()
    {
        var request = new InterestCalcReq(2500m, 7.25m, 3, 10m);
        var originalPrincipal = request.StartingBalance;

        _ = _service.CalculateContributionGrowth(request);

        Assert.Equal(originalPrincipal, request.StartingBalance);
    }

    [Fact]
    public void CalculateContributionGrowth_WhenDurationIsZero_ReturnsPrincipal()
    {
        var request = new InterestCalcReq(2500m, 7.25m, 0, 10m);

        var result = _service.CalculateContributionGrowth(request);

        Assert.Equal(2500m, result.EndingBalance);
        Assert.Equal("$2,500.00", result.CurrencyDisplay);
    }

    [Theory]
    [InlineData("SemiAnnual", 5000, 4.5, 5, 10)]
    [InlineData("Quarterly", 3200, 6.25, 3, 10)]
    [InlineData("Monthly", 1000, 5.0, 1, 10)]
    public void CalculateContributionGrowth_UsesCompoundingCadence(
        string cadence,
        decimal principal,
        decimal annualRatePercent,
        int durationYears,
        decimal monthlyContribution)
    {
        var request = new InterestCalcReq(
            principal,
            annualRatePercent,
            durationYears,
            monthlyContribution,
            cadence);

        var result = _service.CalculateContributionGrowth(request);

        var expected = ComputeExpectedBalance(principal, annualRatePercent, durationYears, monthlyContribution, cadence);

        Assert.Equal(expected, result.EndingBalance);
        Assert.Equal(cadence, result.CompoundingCadence);
        Assert.Equal(monthlyContribution, result.MonthlyContribution);
    }

    [Fact]
    public void CalculateSavingsGrowth_UsesFixedPrincipal()
    {
        var request = new SavingsCalcReq(5000m, 4.25m, 5, "Quarterly");

        var result = _service.CalculateSavingsGrowth(request);

        var expected = ComputeExpectedBalance(5000m, 4.25m, 5, 0m, "Quarterly");

        Assert.Equal(expected, result.EndingBalance);
        Assert.Equal(0m, result.MonthlyContribution);
    }

    private static decimal ComputeExpectedBalance(
        decimal principal,
        decimal annualRatePercent,
        int years,
        decimal monthlyContribution,
        string cadence)
    {
        var periodsPerYear = CompoundingCadenceOptions.GetPeriodsPerYear(cadence);
        var rate = decimal.Divide(annualRatePercent, 100m * periodsPerYear);
        var balance = principal;
        var monthsPerPeriod = 12 / periodsPerYear;
        var totalMonths = years * 12;

        for (var month = 1; month <= totalMonths; month++)
        {
            balance += monthlyContribution;

            if (month % monthsPerPeriod == 0)
            {
                balance += balance * rate;
            }
        }

        return Math.Round(balance, 2, MidpointRounding.ToEven);
    }
}
