using CompoundCalc.Helpers;
using CompoundCalc.Models.Requests;
using CompoundCalc.Models.Responses;
using CompoundCalc.Services.Contracts;

namespace CompoundCalc.Services;

public sealed class CalculationService : ICalculationService
{
    private const string DefaultCalculationVersion = "v1.0";

    public CalculationResult CalculateContributionGrowth(InterestCalcReq request)
    {
        ArgumentNullException.ThrowIfNull(request);
        return RunCalculation(
            request.StartingBalance,
            request.InterestRate,
            request.Years,
            request.CompoundingCadence,
            request.MonthlyContribution);
    }

    public CalculationResult CalculateSavingsGrowth(SavingsCalcReq request)
    {
        ArgumentNullException.ThrowIfNull(request);
        return RunCalculation(
            request.StartingBalance,
            request.InterestRate,
            request.Years,
            request.CompoundingCadence,
            monthlyContribution: 0m);
    }

    public DebtPayoffResult CalculateDebtPayoff(DebtPayoffRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        var monthlyRate = Conversions.ConvertPercentageToDecimal(request.MonthlyRatePercent);
        var remainingBalance = request.TotalDebt;
        var months = 0;
        var totalPaid = 0m;
        var totalInterest = 0m;
        var minimumPaymentRequired = DebtPayoffMath.CalculateMinimumPaymentRequired(request.TotalDebt, request.MonthlyRatePercent);

        if (monthlyRate > 0m && request.MonthlyPayment < minimumPaymentRequired)
        {
            throw new InvalidOperationException("Monthly payment must exceed accrued interest to reduce the balance.");
        }

        const int MaxMonths = 3600;

        while (remainingBalance > 0m)
        {
            var interest = monthlyRate > 0m
                ? decimal.Round(remainingBalance * monthlyRate, 10, MidpointRounding.ToEven)
                : 0m;

            var principalPayment = request.MonthlyPayment - interest;
            if (principalPayment <= 0m)
            {
                throw new InvalidOperationException("Monthly payment does not cover accrued interest.");
            }

            var appliedPrincipal = Math.Min(principalPayment, remainingBalance);
            var appliedPayment = interest + appliedPrincipal;

            remainingBalance -= appliedPrincipal;
            remainingBalance = remainingBalance <= 0m
                ? 0m
                : decimal.Round(remainingBalance, 10, MidpointRounding.ToEven);

            totalInterest += interest;
            totalPaid += appliedPayment;
            months++;

            if (months > MaxMonths)
            {
                throw new InvalidOperationException("Debt payoff calculation exceeded the supported duration.");
            }
        }

        return DebtPayoffResult.Create(
            startingDebt: request.TotalDebt,
            monthlyPayment: request.MonthlyPayment,
            monthlyRatePercent: request.MonthlyRatePercent,
            minimumPaymentRequired: minimumPaymentRequired,
            monthsToPayoff: months,
            totalPaid: totalPaid,
            totalInterestPaid: totalInterest,
            currencyFormatter: Conversions.ConvertDecimalToCurrency,
            calculationVersion: DefaultCalculationVersion);
    }

    public MortgageResult CalculateMortgageEstimate(MortgageRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        var loanAmount = request.HomePrice - request.DownPayment;
        var termMonths = request.TermYears * 12;
        var monthlyRate = decimal.Divide(Conversions.ConvertPercentageToDecimal(request.AnnualRatePercent), 12m);

        var monthlyPrincipalAndInterest = CalculateMonthlyMortgagePayment(loanAmount, monthlyRate, termMonths);
        var monthlyPropertyTax = request.AnnualPropertyTax.HasValue
            ? decimal.Divide(request.AnnualPropertyTax.Value, 12m)
            : 0m;
        var monthlyPmi = request.AnnualPmi.HasValue
            ? decimal.Divide(request.AnnualPmi.Value, 12m)
            : 0m;
        var monthlyTotal = monthlyPrincipalAndInterest + monthlyPropertyTax + monthlyPmi;
        var totalPaid = monthlyPrincipalAndInterest * termMonths;
        var totalInterest = totalPaid - loanAmount;

        return MortgageResult.Create(
            homePrice: request.HomePrice,
            downPayment: request.DownPayment,
            loanAmount: loanAmount,
            annualRatePercent: request.AnnualRatePercent,
            termYears: request.TermYears,
            monthlyPrincipalAndInterest: monthlyPrincipalAndInterest,
            monthlyPropertyTax: monthlyPropertyTax,
            monthlyPmi: monthlyPmi,
            monthlyTotalPayment: monthlyTotal,
            totalPaid: totalPaid,
            totalInterest: totalInterest,
            currencyFormatter: Conversions.ConvertDecimalToCurrency,
            calculationVersion: DefaultCalculationVersion);
    }

    private static CalculationResult RunCalculation(
        decimal principal,
        decimal annualRatePercent,
        int years,
        string cadenceName,
        decimal monthlyContribution)
    {
        var periodsPerYear = CompoundingCadenceOptions.GetPeriodsPerYear(cadenceName);
        var annualRate = Conversions.ConvertPercentageToDecimal(annualRatePercent);
        var ratePerPeriod = decimal.Divide(annualRate, periodsPerYear);
        var totalMonths = years * 12;
        var monthsPerCompoundingPeriod = CalculateMonthsPerCompoundingPeriod(periodsPerYear);

        var balance = principal;
        for (var month = 1; month <= totalMonths; month++)
        {
            balance += monthlyContribution;

            if (month % monthsPerCompoundingPeriod == 0)
            {
                balance += balance * ratePerPeriod;
            }
        }

        return CalculationResult.Create(
            startingPrincipal: principal,
            annualRatePercent: annualRatePercent,
            compoundingCadence: cadenceName,
            durationYears: years,
            monthlyContribution: monthlyContribution,
            endingBalance: balance,
            currencyFormatter: Conversions.ConvertDecimalToCurrency,
            calculationVersion: DefaultCalculationVersion);
    }

    private static int CalculateMonthsPerCompoundingPeriod(int periodsPerYear)
    {
        if (periodsPerYear <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(periodsPerYear), "Periods per year must be positive.");
        }

        const int MonthsInYear = 12;
        if (MonthsInYear % periodsPerYear != 0)
        {
            throw new InvalidOperationException(
                $"Unsupported compounding cadence with {periodsPerYear} periods per year.");
        }

        return MonthsInYear / periodsPerYear;
    }

    private static decimal CalculateMonthlyMortgagePayment(decimal principal, decimal monthlyRate, int termMonths)
    {
        if (principal <= 0m || termMonths <= 0)
        {
            return 0m;
        }

        if (monthlyRate <= 0m)
        {
            return decimal.Divide(principal, termMonths);
        }

        var ratePlusOne = (double)(1m + monthlyRate);
        var discountFactor = Math.Pow(ratePlusOne, termMonths);
        var denominator = 1m - decimal.Divide(1m, (decimal)discountFactor);

        if (denominator <= 0m)
        {
            throw new InvalidOperationException("Unable to compute mortgage payment with the supplied inputs.");
        }

        return decimal.Divide(principal * monthlyRate, denominator);
    }
}
