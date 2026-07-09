using CompoundCalc.Helpers;
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

    public DebtPayoffRequest ToDebtPayoffDomain(DebtPayoffRequestDto request)
        => new(
            request.TotalDebt,
            request.MonthlyPayment,
            request.MonthlyRatePercent);

    public DebtStrategyRequest ToDebtStrategyDomain(DebtStrategyRequestDto request)
        => new(
            request.MonthlyBudget,
            request.Debts
                .Select(debt => new DebtStrategyDebtRequest(
                    debt.ClientDebtId,
                    debt.Name,
                    debt.CurrentBalance,
                    debt.AnnualAprPercent,
                    debt.MinimumPayment))
                .ToList());

    public MortgageRequest ToMortgageDomain(MortgageEstimateRequestDto request)
        => new(
            request.HomePrice,
            CalculateDownPaymentAmount(request),
            request.AnnualRatePercent,
            request.TermYears,
            CalculateAnnualPropertyTax(request),
            CalculateAnnualPmi(request));

    public CarLoanRequest ToCarLoanDomain(CarLoanEstimateRequestDto request)
        => new(
            request.VehiclePrice,
            request.CashDownPayment,
            request.TradeInValue,
            request.TradeInPayoff,
            request.AnnualRatePercent,
            request.TermMonths,
            request.SalesTaxPercent,
            request.SalesTaxAmount,
            request.Fees,
            request.Rebate,
            request.FinancedExtras);

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

    public DebtPayoffResponseDto ToResponse(
        DebtPayoffRequestDto request,
        DebtPayoffResult result,
        string traceId,
        Guid responseId,
        DateTimeOffset calculatedAt)
        => new()
        {
            StartingDebt = result.StartingDebt,
            MonthlyPayment = result.MonthlyPayment,
            MonthlyRatePercent = result.MonthlyRatePercent,
            MinimumPaymentRequired = result.MinimumPaymentRequired,
            MinimumPaymentDisplay = result.MinimumPaymentDisplay,
            MonthsToPayoff = result.MonthsToPayoff,
            TotalPaid = result.TotalPaid,
            TotalInterestPaid = result.TotalInterestPaid,
            TotalPaidDisplay = result.TotalPaidDisplay,
            TotalInterestDisplay = result.TotalInterestDisplay,
            CalculationVersion = result.CalculationVersion,
            TraceId = traceId,
            ResponseId = responseId,
            ClientReference = request.ClientReference,
            RequestedAt = request.RequestedAt,
            CalculatedAt = calculatedAt
        };

    public DebtStrategyResponseDto ToResponse(
        DebtStrategyRequestDto request,
        DebtStrategyResult result,
        string traceId,
        Guid responseId,
        DateTimeOffset calculatedAt)
        => new()
        {
            MonthlyBudget = result.MonthlyBudget,
            MonthlyBudgetDisplay = Conversions.ConvertDecimalToCurrency(result.MonthlyBudget),
            TotalMinimumPayment = result.TotalMinimumPayment,
            TotalMinimumPaymentDisplay = Conversions.ConvertDecimalToCurrency(result.TotalMinimumPayment),
            RecommendedStrategy = result.RecommendedStrategy,
            Snowball = ToResponse(result.Snowball),
            Avalanche = ToResponse(result.Avalanche),
            CalculationVersion = result.CalculationVersion,
            TraceId = traceId,
            ResponseId = responseId,
            ClientReference = request.ClientReference,
            RequestedAt = request.RequestedAt,
            CalculatedAt = calculatedAt
        };

    public MortgageEstimateResponseDto ToResponse(
        MortgageEstimateRequestDto request,
        MortgageResult result,
        string traceId,
        Guid responseId,
        DateTimeOffset calculatedAt)
        => new()
        {
            HomePrice = result.HomePrice,
            DownPayment = result.DownPayment,
            LoanAmount = result.LoanAmount,
            AnnualRatePercent = result.AnnualRatePercent,
            TermYears = result.TermYears,
            MonthlyPrincipalAndInterest = result.MonthlyPrincipalAndInterest,
            MonthlyPropertyTax = result.MonthlyPropertyTax,
            MonthlyPmi = result.MonthlyPmi,
            MonthlyTotalPayment = result.MonthlyTotalPayment,
            TotalPaid = result.TotalPaid,
            TotalInterest = result.TotalInterest,
            LoanAmountDisplay = result.LoanAmountDisplay,
            MonthlyPrincipalAndInterestDisplay = result.MonthlyPrincipalAndInterestDisplay,
            MonthlyPropertyTaxDisplay = result.MonthlyPropertyTaxDisplay,
            MonthlyPmiDisplay = result.MonthlyPmiDisplay,
            MonthlyTotalPaymentDisplay = result.MonthlyTotalPaymentDisplay,
            TotalPaidDisplay = result.TotalPaidDisplay,
            TotalInterestDisplay = result.TotalInterestDisplay,
            CalculationVersion = result.CalculationVersion,
            TraceId = traceId,
            ResponseId = responseId,
            ClientReference = request.ClientReference,
            RequestedAt = request.RequestedAt,
            CalculatedAt = calculatedAt
        };

    public CarLoanEstimateResponseDto ToResponse(
        CarLoanEstimateRequestDto request,
        CarLoanResult result,
        string traceId,
        Guid responseId,
        DateTimeOffset calculatedAt)
        => new()
        {
            VehiclePrice = result.VehiclePrice,
            CashDownPayment = result.CashDownPayment,
            TradeInValue = result.TradeInValue,
            TradeInPayoff = result.TradeInPayoff,
            NetTradeInCredit = result.NetTradeInCredit,
            TotalUpfrontCredit = result.TotalUpfrontCredit,
            SalesTax = result.SalesTax,
            Fees = result.Fees,
            Rebate = result.Rebate,
            FinancedExtras = result.FinancedExtras,
            AmountFinanced = result.AmountFinanced,
            AnnualRatePercent = result.AnnualRatePercent,
            TermMonths = result.TermMonths,
            MonthlyPayment = result.MonthlyPayment,
            TotalPaid = result.TotalPaid,
            TotalInterest = result.TotalInterest,
            AmountFinancedDisplay = result.AmountFinancedDisplay,
            MonthlyPaymentDisplay = result.MonthlyPaymentDisplay,
            TotalPaidDisplay = result.TotalPaidDisplay,
            TotalInterestDisplay = result.TotalInterestDisplay,
            TotalUpfrontCreditDisplay = result.TotalUpfrontCreditDisplay,
            NetTradeInCreditDisplay = result.NetTradeInCreditDisplay,
            CalculationVersion = result.CalculationVersion,
            TraceId = traceId,
            ResponseId = responseId,
            ClientReference = request.ClientReference,
            RequestedAt = request.RequestedAt,
            CalculatedAt = calculatedAt,
            AmortizationSchedule = result.AmortizationSchedule
                .Select(entry => new CarLoanAmortizationEntryDto
                {
                    Month = entry.Month,
                    Payment = entry.Payment,
                    Principal = entry.Principal,
                    Interest = entry.Interest,
                    RemainingBalance = entry.RemainingBalance
                })
                .ToList()
        };

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

    private static DebtStrategyPlanResponseDto ToResponse(DebtStrategyPlanResult result)
        => new()
        {
            Strategy = result.Strategy,
            MonthsToPayoff = result.MonthsToPayoff,
            TotalPaid = result.TotalPaid,
            TotalInterestPaid = result.TotalInterestPaid,
            TotalPaidDisplay = result.TotalPaidDisplay,
            TotalInterestDisplay = result.TotalInterestDisplay,
            FinalPayoffDateLabel = result.FinalPayoffDateLabel,
            PayoffOrder = result.PayoffOrder
                .Select(item => new DebtStrategyPayoffOrderItemResponseDto
                {
                    ClientDebtId = item.ClientDebtId,
                    Name = item.Name,
                    PayoffMonth = item.PayoffMonth,
                    StartingBalance = item.StartingBalance,
                    AnnualAprPercent = item.AnnualAprPercent
                })
                .ToList(),
            Timeline = result.Timeline
                .Select(month => new DebtStrategyMonthResponseDto
                {
                    MonthNumber = month.MonthNumber,
                    StartingBalance = month.StartingBalance,
                    InterestCharged = month.InterestCharged,
                    PaymentApplied = month.PaymentApplied,
                    EndingBalance = month.EndingBalance,
                    Debts = month.Debts
                        .Select(debt => new DebtStrategyMonthDebtResponseDto
                        {
                            ClientDebtId = debt.ClientDebtId,
                            Name = debt.Name,
                            StartingBalance = debt.StartingBalance,
                            InterestCharged = debt.InterestCharged,
                            PaymentApplied = debt.PaymentApplied,
                            MinimumPaymentApplied = debt.MinimumPaymentApplied,
                            ExtraPaymentApplied = debt.ExtraPaymentApplied,
                            EndingBalance = debt.EndingBalance,
                            IsTargeted = debt.IsTargeted,
                            IsPaidOffThisMonth = debt.IsPaidOffThisMonth
                        })
                        .ToList()
                })
                .ToList()
        };

    private static decimal CalculateDownPaymentAmount(MortgageEstimateRequestDto request)
    {
        if (string.Equals(request.DownPaymentType?.Trim(), "Percent", StringComparison.OrdinalIgnoreCase))
        {
            return request.HomePrice * (request.DownPaymentValue / 100m);
        }

        return request.DownPaymentValue;
    }

    private static decimal? CalculateAnnualPropertyTax(MortgageEstimateRequestDto request)
    {
        if (!request.PropertyTaxValue.HasValue)
        {
            return null;
        }

        if (string.Equals(request.PropertyTaxType?.Trim(), "Percent", StringComparison.OrdinalIgnoreCase))
        {
            return request.HomePrice * (request.PropertyTaxValue.Value / 100m);
        }

        return request.PropertyTaxValue;
    }

    private static decimal? CalculateAnnualPmi(MortgageEstimateRequestDto request)
    {
        if (!request.PmiValue.HasValue)
        {
            return null;
        }

        if (string.Equals(request.PmiType?.Trim(), "Percent", StringComparison.OrdinalIgnoreCase))
        {
            var loanAmount = request.HomePrice - CalculateDownPaymentAmount(request);
            return loanAmount * (request.PmiValue.Value / 100m);
        }

        return request.PmiValue;
    }
}
