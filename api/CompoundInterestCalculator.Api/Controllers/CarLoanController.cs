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
[Route("api/v{version:apiVersion}/car-loan")]
public sealed class CarLoanController : ControllerBase
{
    private readonly ICalculationService _calculationService;
    private readonly CalculationMapper _mapper;
    private readonly ILogger<CarLoanController> _logger;

    public CarLoanController(
        ICalculationService calculationService,
        CalculationMapper mapper,
        ILogger<CarLoanController> logger)
    {
        _calculationService = calculationService;
        _mapper = mapper;
        _logger = logger;
    }

    [HttpPost("estimate")]
    [ProducesResponseType(typeof(CarLoanEstimateResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public ActionResult<CarLoanEstimateResponseDto> CalculateEstimate([FromBody] CarLoanEstimateRequestDto request)
    {
        var domainRequest = _mapper.ToCarLoanDomain(request);
        return ExecuteCalculation(
            request.VehiclePrice,
            request.AnnualRatePercent,
            () => _calculationService.CalculateCarLoanEstimate(domainRequest),
            (traceId, result) => _mapper.ToResponse(request, result, traceId, Guid.NewGuid(), DateTimeOffset.UtcNow),
            "car loan estimate");
    }

    private ActionResult<CarLoanEstimateResponseDto> ExecuteCalculation(
        decimal vehiclePrice,
        decimal annualRatePercent,
        Func<CarLoanResult> calculate,
        Func<string, CarLoanResult, CarLoanEstimateResponseDto> buildResponse,
        string scenario)
    {
        var traceId = HttpContext.TraceIdentifier;
        _logger.LogInformation(
            "Calculating {Scenario} for trace {TraceId} with vehicle price {VehiclePrice} and rate {Rate}",
            scenario,
            traceId,
            vehiclePrice,
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
