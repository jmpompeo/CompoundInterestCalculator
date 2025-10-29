using CompoundCalc.Models.Requests;
using CompoundCalc.Models.Responses;
using CompoundInterestCalculator.Api.Models.Requests;
using CompoundInterestCalculator.Api.Models.Responses;

namespace CompoundInterestCalculator.Api.Mappers;

public sealed class CalculationMapper
{
    public InterestCalcReq ToDomain(CalculationRequestDto request)
        => new(request.Principal, request.AnnualRatePercent, request.DurationYears);

    public CalculationResponseDto ToResponse(
        CalculationRequestDto request,
        CalculationResult result,
        string traceId,
        Guid responseId,
        DateTimeOffset calculatedAt)
        => new()
        {
            StartingPrincipal = result.StartingPrincipal,
            AnnualRatePercent = result.AnnualRatePercent,
            CompoundingCadence = request.CompoundingCadence,
            DurationYears = result.DurationYears,
            EndingBalance = result.EndingBalance,
            CurrencyDisplay = result.CurrencyDisplay,
            CalculationVersion = result.CalculationVersion,
            TraceId = traceId,
            ResponseId = responseId,
            ClientReference = request.ClientReference,
            RequestedAt = request.RequestedAt,
            CalculatedAt = calculatedAt
        };
}
