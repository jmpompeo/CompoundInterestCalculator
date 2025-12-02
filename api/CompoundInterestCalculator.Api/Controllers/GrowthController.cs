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
[Route("api/v{version:apiVersion}/growth")]
public sealed class GrowthController : ControllerBase
{
    private readonly ICalculationService _calculationService;
    private readonly CalculationMapper _mapper;
    private readonly ILogger<GrowthController> _logger;

    public GrowthController(
        ICalculationService calculationService,
        CalculationMapper mapper,
        ILogger<GrowthController> logger)
    {
        _calculationService = calculationService;
        _mapper = mapper;
        _logger = logger;
    }

    [HttpPost("contribution")]
    [ProducesResponseType(typeof(CalculationResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public ActionResult<CalculationResponseDto> CalculateContributionGrowth([FromBody] ContributionGrowthRequestDto request)
    {
        var domainRequest = _mapper.ToContributionDomain(request);
        return ExecuteCalculation(
            request.Principal,
            request.AnnualRatePercent,
            () => _calculationService.CalculateContributionGrowth(domainRequest),
            (traceId, result) => _mapper.ToResponse(request, result, traceId, Guid.NewGuid(), DateTimeOffset.UtcNow),
            "contribution growth");
    }

    [HttpPost("savings")]
    [ProducesResponseType(typeof(CalculationResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public ActionResult<CalculationResponseDto> CalculateSavingsGrowth([FromBody] SavingsGrowthRequestDto request)
    {
        var domainRequest = _mapper.ToSavingsDomain(request);
        return ExecuteCalculation(
            request.Principal,
            request.AnnualRatePercent,
            () => _calculationService.CalculateSavingsGrowth(domainRequest),
            (traceId, result) => _mapper.ToResponse(request, result, traceId, Guid.NewGuid(), DateTimeOffset.UtcNow),
            "savings growth");
    }

    private ActionResult<CalculationResponseDto> ExecuteCalculation(
        decimal principal,
        decimal annualRatePercent,
        Func<CalculationResult> calculate,
        Func<string, CalculationResult, CalculationResponseDto> buildResponse,
        string scenario)
    {
        var traceId = HttpContext.TraceIdentifier;
        _logger.LogInformation(
            "Calculating {Scenario} for trace {TraceId} with principal {Principal} and rate {Rate}",
            scenario,
            traceId,
            principal,
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
