using CompoundCalc.Models.Requests;
using CompoundCalc.Models.Responses;
using CompoundInterestCalculator.Api.Models.Requests;
using CompoundInterestCalculator.Api.Models.Responses;

namespace CompoundInterestCalculator.Api.Mappers;

public sealed class CalculationMapper
{
    public InterestCalcReq ToContributionDomain(ContributionGrowthRequestDto request)
        => new(
            request.Principal,
            request.AnnualRatePercent,
            request.DurationYears,
            request.MonthlyContribution,
            request.CompoundingCadence);

    public SavingsCalcReq ToSavingsDomain(SavingsGrowthRequestDto request)
        => new(
            request.Principal,
            request.AnnualRatePercent,
            request.DurationYears,
            request.CompoundingCadence);

    public CalculationResponseDto ToResponse(
        ContributionGrowthRequestDto request,
        CalculationResult result,
        string traceId,
        Guid responseId,
        DateTimeOffset calculatedAt)
        => CreateResponse(result, traceId, responseId, calculatedAt, request.ClientReference, request.RequestedAt);

    public CalculationResponseDto ToResponse(
        SavingsGrowthRequestDto request,
        CalculationResult result,
        string traceId,
        Guid responseId,
        DateTimeOffset calculatedAt)
        => CreateResponse(result, traceId, responseId, calculatedAt, request.ClientReference, request.RequestedAt);

    private static CalculationResponseDto CreateResponse(
        CalculationResult result,
        string traceId,
        Guid responseId,
        DateTimeOffset calculatedAt,
        string? clientReference,
        DateTimeOffset? requestedAt)
        => new()
        {
            StartingPrincipal = result.StartingPrincipal,
            AnnualRatePercent = result.AnnualRatePercent,
            CompoundingCadence = result.CompoundingCadence,
            DurationYears = result.DurationYears,
            MonthlyContribution = result.MonthlyContribution,
            EndingBalance = result.EndingBalance,
            CurrencyDisplay = result.CurrencyDisplay,
            CalculationVersion = result.CalculationVersion,
            TraceId = traceId,
            ResponseId = responseId,
            ClientReference = clientReference,
            RequestedAt = requestedAt,
            CalculatedAt = calculatedAt
        };
}
