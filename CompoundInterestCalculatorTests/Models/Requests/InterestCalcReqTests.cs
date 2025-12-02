using CompoundCalc.Models.Requests;

namespace CompoundInterestCalculatorTests.Models.Requests;

public class InterestCalcReqTests
{
    [Fact]
    public void InterestCalcReq_Should_Throw_Out_Of_Range_When_Starting_Balance_Is_Negative()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new InterestCalcReq(-100, 5, 5, 10));
    }

    [Fact]
    public void InterestCalcReq_Should_Throw_Out_Of_Range_When_Interest_Rate_Is_Negative()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new InterestCalcReq(100, -5, 5, 10));
    }

    [Fact]
    public void InterestCalcReq_Should_Throw_Out_Of_Range_When_Years_Negative()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new InterestCalcReq(100, 5, -5, 10));
    }

    [Fact]
    public void InterestCalcReq_Should_Throw_Out_Of_Range_When_Years_Over_100()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new InterestCalcReq(100, 5, 105, 10));
    }

    [Fact]
    public void InterestCalcReq_Should_Throw_When_Cadence_Unsupported()
    {
        Assert.Throws<ArgumentException>(() => new InterestCalcReq(100, 5, 5, 10, "Weekly"));
    }

    [Fact]
    public void InterestCalcReq_Should_Throw_When_MonthlyContribution_Negative()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new InterestCalcReq(100, 5, 5, -10));
    }

    [Fact]
    public void InterestCalcReq_Normalizes_Cadence_Casing()
    {
        var request = new InterestCalcReq(100, 5, 5, 10, "monthly");

        Assert.Equal("Monthly", request.CompoundingCadence);
    }

}
