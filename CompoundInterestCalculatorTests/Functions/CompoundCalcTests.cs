using CompoundCalc.Functions;
using CompoundCalc.Models.Requests;
using CompoundCalc.Services;
using Microsoft.Extensions.Logging;
using Moq;


namespace CompoundInterestCalculatorTests.Functions;

public class CompoundCalcTests
{
    private readonly Mock<CalculationService> _mockCalcService;
    private readonly Mock<ILogger<CompoundCalculator>> _mockLogger = new();
    private readonly CompoundCalculator _sut;

    public CompoundCalcTests()
    {
        _mockCalcService = new Mock<CalculationService>();
        _sut = new CompoundCalculator(_mockLogger.Object, _mockCalcService.Object);
    }

    [Fact]
    public async Task CompoundCalculator_Returns_Ok_Object_Result()
    {
        var req = new InterestCalcReq(1000, 10, 10);

        //var result = 

    }
}
