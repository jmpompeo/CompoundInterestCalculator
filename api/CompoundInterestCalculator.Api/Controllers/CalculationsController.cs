using CompoundCalc.Services.Contracts;
using CompoundInterestCalculator.Api.Mappers;
using CompoundInterestCalculator.Api.Models.Requests;
using CompoundInterestCalculator.Api.Models.Responses;
using Microsoft.AspNetCore.Mvc;
using CompoundInterestCalculator.Api.Telemetry;

namespace CompoundInterestCalculator.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/calculations")]
public sealed class CalculationsController : ControllerBase
{
    private readonly ICalculationService _calculationService;
    private readonly CalculationMapper _mapper;
    private readonly ILogger<CalculationsController> _logger;

    public CalculationsController(
        ICalculationService calculationService,
        CalculationMapper mapper,
        ILogger<CalculationsController> logger)
    {
        _calculationService = calculationService;
        _mapper = mapper;
        _logger = logger;
    }

    [HttpPost]
    [ProducesResponseType(typeof(CalculationResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public ActionResult<CalculationResponseDto> Calculate([FromBody] CalculationRequestDto request)
    {
        var traceId = HttpContext.TraceIdentifier;
        _logger.LogInformation(
            "Calculating compound interest for trace {TraceId} with principal {Principal} and rate {Rate}",
            traceId,
            request.Principal,
            request.AnnualRatePercent);

        var domainRequest = _mapper.ToDomain(request);
        try
        {
            var result = _calculationService.CalculateCompoundInterest(domainRequest);

            var response = _mapper.ToResponse(
                request,
                result,
                traceId,
                Guid.NewGuid(),
                DateTimeOffset.UtcNow);

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogCalculationFailure(traceId, ex, "Unexpected error while calculating compound interest.");

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
