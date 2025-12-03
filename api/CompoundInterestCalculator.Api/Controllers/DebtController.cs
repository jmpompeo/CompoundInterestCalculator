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
[Route("api/v{version:apiVersion}/debt")]
public sealed class DebtController : ControllerBase
{
    private readonly ICalculationService _calculationService;
    private readonly CalculationMapper _mapper;
    private readonly ILogger<DebtController> _logger;

    public DebtController(
        ICalculationService calculationService,
        CalculationMapper mapper,
        ILogger<DebtController> logger)
    {
        _calculationService = calculationService;
        _mapper = mapper;
        _logger = logger;
    }

    [HttpPost("payoff")]
    [ProducesResponseType(typeof(DebtPayoffResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public ActionResult<DebtPayoffResponseDto> CalculatePayoff([FromBody] DebtPayoffRequestDto request)
    {
        var domainRequest = _mapper.ToDebtPayoffDomain(request);
        return ExecuteCalculation(
            () => _calculationService.CalculateDebtPayoff(domainRequest),
            (traceId, result) => _mapper.ToResponse(request, result, traceId, Guid.NewGuid(), DateTimeOffset.UtcNow),
            "debt payoff");
    }

    private ActionResult<DebtPayoffResponseDto> ExecuteCalculation(
        Func<DebtPayoffResult> calculate,
        Func<string, DebtPayoffResult, DebtPayoffResponseDto> buildResponse,
        string scenario)
    {
        var traceId = HttpContext.TraceIdentifier;
        _logger.LogInformation("Calculating {Scenario} for trace {TraceId}", scenario, traceId);

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
