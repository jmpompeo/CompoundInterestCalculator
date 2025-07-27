using System.Runtime.CompilerServices;
using CompoundCalc.Models.Requests;
using CompoundCalc.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace CompoundCalc.Functions;

public class CompoundCalculator(ILogger<CompoundCalculator> logger, CalculationService calculationService)
{
    [Function(nameof(CompoundCalculator))]
    public async Task<IActionResult> RunAsync([HttpTrigger(AuthorizationLevel.Anonymous,
        "post")] HttpRequest req)
    {
        var reqBody = await new StreamReader(req.Body).ReadToEndAsync();

        if (string.IsNullOrWhiteSpace(reqBody))
        {
            logger.LogError("Incoming request body cannot be null");

            return new BadRequestObjectResult("request body cannot be null");
        }

        var intCalcReq = JsonConvert.DeserializeObject<InterestCalcReq>(reqBody);

        string? endingBalance;
        try
        {
            endingBalance = calculationService.
                GetYearlyAmountWithInterest(intCalcReq);
        }
        catch (Exception ex)
        {
            logger.LogError("Error calculating interest {exception}", ex.Message);
            return new BadRequestObjectResult("Error calculating interest");
        }

        return new OkObjectResult($"Your ending balance is {endingBalance}");
    }
}
