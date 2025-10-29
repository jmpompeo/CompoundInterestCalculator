using CompoundCalc.Models.Requests;
using CompoundCalc.Services;

namespace CompoundInterestCalculatorTests.Services;

public class CalcServiceTests
{
    // Test 1: Calculate the yearly amount with interest for 10 years with a different interest rates
    [Theory]
    [InlineData(1000.0, 5, 10, "$1,628.89")]
    [InlineData(2000.0, 10, 10, "$5,187.48")]
    [InlineData(5000.0, 3, 10, "$6,719.58")]
    [InlineData(1500.0, 8, 10, "$3,238.39")]
    [InlineData(2500.0, 2, 10, "$3,047.49")]
    public void CalculateCompoundInterest_CalculatesCorrectly(double startingBalance, double interestPercentage, int years, string expected)
    {
        // Arrange
        var calculations = new CalculationService();

        var req = new InterestCalcReq((decimal)startingBalance, (decimal)interestPercentage, years);

        // Act
        var result = calculations.CalculateCompoundInterest(req);

        // Assert
        Assert.Equal(expected, result.CurrencyDisplay);
    }


}
