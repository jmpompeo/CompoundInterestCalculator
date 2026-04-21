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

    [Fact]
    public void CalculateDebtPayoff_WithZeroInterest_CompletesInWholeMonths()
    {
        var request = new DebtPayoffRequest(1000m, 250m, 0m);

        var result = _service.CalculateDebtPayoff(request);

        Assert.Equal(4, result.MonthsToPayoff);
        Assert.Equal(1000m, result.TotalPaid);
        Assert.Equal(0m, result.TotalInterestPaid);
        Assert.Equal("$1,000.00", result.TotalPaidDisplay);
        Assert.Equal(0.01m, result.MinimumPaymentRequired);
        Assert.Equal("$0.01", result.MinimumPaymentDisplay);
    }

    [Fact]
    public void CalculateDebtPayoff_WithInterest_ComputesAccruedInterest()
    {
        var request = new DebtPayoffRequest(1000m, 600m, 1m);

        var result = _service.CalculateDebtPayoff(request);

        Assert.Equal(2, result.MonthsToPayoff);
        Assert.Equal(1014.10m, result.TotalPaid);
        Assert.Equal(14.10m, result.TotalInterestPaid);
        Assert.Equal("$1,014.10", result.TotalPaidDisplay);
        Assert.Equal("$14.10", result.TotalInterestDisplay);
        Assert.Equal(10.01m, result.MinimumPaymentRequired);
        Assert.Equal("$10.01", result.MinimumPaymentDisplay);
    }

    [Fact]
    public void CalculateDebtPayoff_WhenPaymentCannotCoverInterest_Throws()
    {
        var request = new DebtPayoffRequest(1000m, 5m, 1m);

        Assert.Throws<InvalidOperationException>(() => _service.CalculateDebtPayoff(request));
    }

    [Fact]
    public void CalculateCarLoanEstimate_ComputesExpectedTotals()
    {
        var request = new CarLoanRequest(
            vehiclePrice: 35000m,
            cashDownPayment: 3000m,
            tradeInValue: 8000m,
            tradeInPayoff: 5000m,
            annualRatePercent: 6.5m,
            termMonths: 60,
            salesTaxPercent: 7.5m,
            salesTaxAmount: null,
            fees: 1200m,
            rebate: 1000m,
            financedExtras: 500m);

        var result = _service.CalculateCarLoanEstimate(request);

        Assert.Equal(6000m, result.TotalUpfrontCredit);
        Assert.Equal(32325m, result.AmountFinanced);
        Assert.Equal(632.16m, result.MonthlyPayment);
        Assert.Equal(37929.59m, result.TotalPaid);
        Assert.Equal(5604.59m, result.TotalInterest);
        Assert.Equal("$32,325.00", result.AmountFinancedDisplay);
        Assert.Equal(60, result.AmortizationSchedule.Count);
    }

    [Fact]
    public void CalculateCarLoanEstimate_WithZeroApr_HasNoInterest()
    {
        var request = new CarLoanRequest(
            vehiclePrice: 20000m,
            cashDownPayment: 2000m,
            tradeInValue: 0m,
            tradeInPayoff: 0m,
            annualRatePercent: 0m,
            termMonths: 40,
            salesTaxPercent: null,
            salesTaxAmount: 0m,
            fees: 0m,
            rebate: 0m,
            financedExtras: 0m);

        var result = _service.CalculateCarLoanEstimate(request);

        Assert.Equal(18000m, result.AmountFinanced);
        Assert.Equal(450m, result.MonthlyPayment);
        Assert.Equal(18000m, result.TotalPaid);
        Assert.Equal(0m, result.TotalInterest);
        Assert.Equal(40, result.AmortizationSchedule.Count);
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
