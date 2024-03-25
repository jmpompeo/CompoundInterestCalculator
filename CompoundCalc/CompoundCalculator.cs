using CompoundCalc.Models.Requests;
using CompoundCalc.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace CompoundCalc;

public class CompoundCalculator
{
    private readonly CalculationService _calculationService;
    private readonly ILogger<CompoundCalculator> _logger;

    public CompoundCalculator(ILogger<CompoundCalculator> logger, CalculationService calculationService)
    {
        _logger = logger;
        _calculationService = calculationService;
    }

    [Function("CompoundCalculator")]
    public async Task<IActionResult> Run([HttpTrigger(AuthorizationLevel.Anonymous,
        "get")] HttpRequest req)
    {
        var reqBody = await new StreamReader(req.Body).ReadToEndAsync();

        if (reqBody is null)
        {
            _logger.LogError("Incoming request body cannot be null");

            return new BadRequestObjectResult("request body cannot be null");
        }

        var intCalcReq = JsonConvert.DeserializeObject<InterestCalcReq>(reqBody);

        string? endingBalance;
        try
        {
            endingBalance = _calculationService.
                GetYearlyAmountWithInterest(intCalcReq);
        }
        catch (Exception ex)
        {
            _logger.LogError("Error calculating interest {exception}", ex.Message);
            throw;
        }

        return new OkObjectResult($"Your ending balance is {endingBalance}");
    }
}
