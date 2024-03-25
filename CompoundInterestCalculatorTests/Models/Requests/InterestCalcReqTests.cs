using CompoundCalc.Models.Requests;

namespace CompoundInterestCalculatorTests.Models.Requests;

public class InterestCalcReqTests
{
    [Fact]
    public void InterestCalcReq_Should_Throw_Out_Of_Range_When_Starting_Balance_Is_Negative()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new InterestCalcReq(-100, 5, 5));
    }

    [Fact]
    public void InterestCalcReq_Should_Throw_Out_Of_Range_When_Interest_Rate_Is_Negative()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new InterestCalcReq(100, -5, 5));
    }

    [Fact]
    public void InterestCalcReq_Should_Throw_Out_Of_Range_When_Years_Negative()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new InterestCalcReq(100, 5, -5));
    }

    [Fact]
    public void InterestCalcReq_Should_Throw_Out_Of_Range_When_Years_Over_100()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new InterestCalcReq(100, 5, 105));
    }

}