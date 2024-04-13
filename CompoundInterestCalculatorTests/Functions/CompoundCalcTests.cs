using CompoundCalc.Functions;
using CompoundCalc.Models.Requests;
using CompoundCalc.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using Newtonsoft.Json;
using System.Text;

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

    private HttpRequest CreateHttpRequest(string reqBody)
    {
        var context = new DefaultHttpContext();
        var req = context.Request;

        byte[] byteArray = Encoding.ASCII.GetBytes(reqBody);
        MemoryStream stream = new MemoryStream(byteArray);

        req.Body = stream;

        return req;
    }

    [Fact]
    public async Task CompoundCalculator_Returns_Ok_Object_Result()
    {
        var interestReq = new InterestCalcReq(1000, 5, 10);
        var req = CreateHttpRequest(JsonConvert.SerializeObject(interestReq));
        await _sut.RunAsync(req);
    }

    [Fact]
    public async Task CompoundCalculator_Returns_Bad_Result_Null_Body()
    {
        InterestCalcReq interestReq = null;
        var req = CreateHttpRequest(JsonConvert.SerializeObject(interestReq));
        var result = await _sut.RunAsync(req);

        Assert.IsType<BadRequestObjectResult>(result);
    }
}
