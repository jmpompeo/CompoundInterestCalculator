using CompoundCalc.Models.Responses;
using CompoundCalc.Services.Contracts;
using CompoundInterestCalculator.Api.Mappers;
using CompoundInterestCalculator.Api.Models.Requests;
using CompoundInterestCalculator.Api.Models.Responses;
using CompoundInterestCalculator.Api.Telemetry;
using Microsoft.AspNetCore.Mvc;

namespace CompoundInterestCalculator.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/mortgage")]
public sealed class MortgageController : ControllerBase
{
    private readonly ICalculationService _calculationService;
    private readonly CalculationMapper _mapper;
    private readonly ILogger<MortgageController> _logger;

    public MortgageController(
        ICalculationService calculationService,
        CalculationMapper mapper,
        ILogger<MortgageController> logger)
    {
        _calculationService = calculationService;
        _mapper = mapper;
        _logger = logger;
    }

    [HttpPost("estimate")]
    [ProducesResponseType(typeof(MortgageEstimateResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public ActionResult<MortgageEstimateResponseDto> CalculateEstimate([FromBody] MortgageEstimateRequestDto request)
    {
        var domainRequest = _mapper.ToMortgageDomain(request);
        return ExecuteCalculation(
            request.HomePrice,
            request.AnnualRatePercent,
            () => _calculationService.CalculateMortgageEstimate(domainRequest),
            (traceId, result) => _mapper.ToResponse(request, result, traceId, Guid.NewGuid(), DateTimeOffset.UtcNow),
            "mortgage estimate");
    }

    private ActionResult<MortgageEstimateResponseDto> ExecuteCalculation(
        decimal homePrice,
        decimal annualRatePercent,
        Func<MortgageResult> calculate,
        Func<string, MortgageResult, MortgageEstimateResponseDto> buildResponse,
        string scenario)
    {
        var traceId = HttpContext.TraceIdentifier;
        _logger.LogInformation(
            "Calculating {Scenario} for trace {TraceId} with home price {HomePrice} and rate {Rate}",
            scenario,
            traceId,
            homePrice,
            annualRatePercent);

        try
        {
            var result = calculate();
            var response = buildResponse(traceId, result);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogCalculationFailure(traceId, ex, $"Unexpected error while calculating {scenario}.");
            var problem = new ProblemDetails
            {
                Type = "https://calc.example.com/errors/server",
                Title = "Calculation failed",
                Status = StatusCodes.Status500InternalServerError,
                Detail = "An unexpected error occurred while processing the request.",
                Instance = HttpContext.Request.Path
            };

            problem.Extensions["traceId"] = traceId;

            return StatusCode(StatusCodes.Status500InternalServerError, problem);
        }
    }
}
