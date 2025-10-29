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

        var expected = ComputeExpectedBalance(10000m, 5.5m, 10);

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

    private static decimal ComputeExpectedBalance(decimal principal, decimal annualRatePercent, int years)
    {
        var rate = annualRatePercent / 100m;
        var balance = principal;
        for (var i = 0; i < years; i++)
        {
            balance += balance * rate;
        }

        return Math.Round(balance, 2, MidpointRounding.ToEven);
    }
}
