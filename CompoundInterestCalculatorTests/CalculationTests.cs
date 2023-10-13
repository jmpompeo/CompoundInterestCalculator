using CompoundInterestCalculator.Services;
using System;
using Xunit;

public class CalculationTests
{
    // Test 1: Calculate the yearly amount with interest for 10 years with a 5% interest rate.
    [Theory]
    [InlineData(1000.0, 5, 10, "$1,628.89")]
    [InlineData(2000.0, 10, 10, "$5,187.48")]
    [InlineData(5000.0, 3, 10, "$6,719.58")]
    [InlineData(1500.0, 8, 10, "$3,238.39")]
    [InlineData(2500.0, 2, 10, "$3,047.49")]
    public void GetYearlyAmountWithInterest_CalculatesCorrectly(double startingBalance, double interestPercentage, int years, string expected)
    {
        var calculations = new Calculations();

        // Act
        string result = calculations.GetYearlyAmountWithInterest(startingBalance, interestPercentage, years);

        // Assert
        Assert.Equal(expected, result);
    }

    // Test 2: When the number of years is zero, the balance should remain the same.
    [Theory]
    [InlineData(1000.0, 0.05, "$1,000.00")]
    [InlineData(2000.0, 0.1, "$2,000.00")]
    [InlineData(5000.0, 0.03, "$5,000.00")]
    [InlineData(1500.0, 0.08, "$1,500.00")]
    [InlineData(2500.0, 0.02, "$2,500.00")]
    public void GetYearlyAmountWithInterest_ReturnsInputBalance_WhenYearsIsZero(double startingBalance, double interestPercentage, string expected)
    {
        var calculations = new Calculations();

        // Act
        string result = calculations.GetYearlyAmountWithInterest(startingBalance, interestPercentage, 0);

        // Assert
        Assert.Equal(expected, result);
    }
}
