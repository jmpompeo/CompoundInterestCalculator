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

    public DebtStrategyResult CalculateDebtStrategy(DebtStrategyRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        var totalMinimumPayment = request.Debts.Sum(debt => debt.MinimumPayment);
        if (request.MonthlyBudget < totalMinimumPayment)
        {
            throw new InvalidOperationException("Monthly budget must cover the total minimum payments.");
        }

        var firstMonthInterest = request.Debts.Sum(debt => CalculateMonthlyInterest(debt.CurrentBalance, debt.AnnualAprPercent));
        if (firstMonthInterest > 0m && request.MonthlyBudget <= firstMonthInterest)
        {
            throw new InvalidOperationException("Monthly budget must exceed the first month of accrued interest.");
        }

        var snowball = SimulateDebtStrategy(
            "Snowball",
            request.MonthlyBudget,
            request.Debts
                .OrderBy(debt => debt.CurrentBalance)
                .ThenByDescending(debt => debt.AnnualAprPercent)
                .ThenBy(debt => debt.Name, StringComparer.OrdinalIgnoreCase)
                .ThenBy(debt => debt.ClientDebtId, StringComparer.OrdinalIgnoreCase));

        var avalanche = SimulateDebtStrategy(
            "Avalanche",
            request.MonthlyBudget,
            request.Debts
                .OrderByDescending(debt => debt.AnnualAprPercent)
                .ThenBy(debt => debt.CurrentBalance)
                .ThenBy(debt => debt.Name, StringComparer.OrdinalIgnoreCase)
                .ThenBy(debt => debt.ClientDebtId, StringComparer.OrdinalIgnoreCase));

        var recommendedStrategy = snowball.TotalInterestPaid == avalanche.TotalInterestPaid
            ? "Tie"
            : snowball.TotalInterestPaid < avalanche.TotalInterestPaid
                ? snowball.Strategy
                : avalanche.Strategy;

        return new DebtStrategyResult(
            MonthlyBudget: RoundCurrency(request.MonthlyBudget),
            TotalMinimumPayment: RoundCurrency(totalMinimumPayment),
            RecommendedStrategy: recommendedStrategy,
            Snowball: snowball,
            Avalanche: avalanche,
            CalculationVersion: DefaultCalculationVersion);
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

    public CarLoanResult CalculateCarLoanEstimate(CarLoanRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        var netTradeInCredit = Math.Max(request.TradeInValue - request.TradeInPayoff, 0m);
        var totalUpfrontCredit = request.CashDownPayment + netTradeInCredit;
        var taxableBase = request.VehiclePrice;
        var salesTax = request.SalesTaxAmount ?? (taxableBase * (request.SalesTaxPercent!.Value / 100m));
        var preCreditTotal = request.VehiclePrice + salesTax + request.Fees + request.FinancedExtras - request.Rebate;
        var amountFinanced = Math.Max(preCreditTotal - totalUpfrontCredit, 0m);

        var monthlyRate = decimal.Divide(Conversions.ConvertPercentageToDecimal(request.AnnualRatePercent), 12m);
        var monthlyPayment = CalculateMonthlyMortgagePayment(amountFinanced, monthlyRate, request.TermMonths);

        var amortization = BuildAmortizationSchedule(amountFinanced, monthlyRate, request.TermMonths, monthlyPayment);
        var totalPaid = amortization.Sum(x => x.Payment);
        var totalInterest = amortization.Sum(x => x.Interest);

        return CarLoanResult.Create(
            vehiclePrice: request.VehiclePrice,
            cashDownPayment: request.CashDownPayment,
            tradeInValue: request.TradeInValue,
            tradeInPayoff: request.TradeInPayoff,
            netTradeInCredit: netTradeInCredit,
            totalUpfrontCredit: totalUpfrontCredit,
            salesTax: salesTax,
            fees: request.Fees,
            rebate: request.Rebate,
            financedExtras: request.FinancedExtras,
            amountFinanced: amountFinanced,
            annualRatePercent: request.AnnualRatePercent,
            termMonths: request.TermMonths,
            monthlyPayment: monthlyPayment,
            totalPaid: totalPaid,
            totalInterest: totalInterest,
            amortizationSchedule: amortization,
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

    private static IReadOnlyList<CarLoanAmortizationEntry> BuildAmortizationSchedule(
        decimal principal,
        decimal monthlyRate,
        int termMonths,
        decimal scheduledPayment)
    {
        var schedule = new List<CarLoanAmortizationEntry>(termMonths);
        var remainingBalance = principal;

        for (var month = 1; month <= termMonths; month++)
        {
            if (remainingBalance <= 0m)
            {
                break;
            }

            var interest = monthlyRate > 0m
                ? decimal.Round(remainingBalance * monthlyRate, 10, MidpointRounding.ToEven)
                : 0m;
            var payment = Math.Min(scheduledPayment, remainingBalance + interest);
            var principalPaid = payment - interest;
            remainingBalance = decimal.Round(Math.Max(remainingBalance - principalPaid, 0m), 10, MidpointRounding.ToEven);

            schedule.Add(new CarLoanAmortizationEntry(
                Month: month,
                Payment: decimal.Round(payment, 2, MidpointRounding.ToEven),
                Principal: decimal.Round(principalPaid, 2, MidpointRounding.ToEven),
                Interest: decimal.Round(interest, 2, MidpointRounding.ToEven),
                RemainingBalance: decimal.Round(remainingBalance, 2, MidpointRounding.ToEven)));
        }

        return schedule;
    }

    private static DebtStrategyPlanResult SimulateDebtStrategy(
        string strategy,
        decimal monthlyBudget,
        IEnumerable<DebtStrategyDebtRequest> orderedDebts)
    {
        const int MaxMonths = 3600;
        var orderedDebtList = orderedDebts.ToList();
        var states = orderedDebtList
            .Select((debt, index) => new DebtSimulationState(
                debt.ClientDebtId,
                debt.Name,
                debt.CurrentBalance,
                debt.AnnualAprPercent,
                debt.MinimumPayment,
                index))
            .ToList();
        var timeline = new List<DebtStrategyMonthResult>();
        var totalPaid = 0m;
        var totalInterest = 0m;
        var months = 0;

        while (states.Any(state => state.Balance > 0m))
        {
            months++;
            if (months > MaxMonths)
            {
                throw new InvalidOperationException("Debt strategy calculation exceeded the supported duration.");
            }

            var monthDebts = states
                .Where(state => state.Balance > 0m)
                .ToDictionary(
                    state => state.ClientDebtId,
                    state => new DebtStrategyMonthDebtAccumulator(state.ClientDebtId, state.Name, state.Balance));

            var monthStartingBalance = states.Sum(state => state.Balance);
            var monthInterest = 0m;
            var monthPayment = 0m;

            foreach (var state in states.Where(state => state.Balance > 0m))
            {
                var interest = CalculateMonthlyInterest(state.Balance, state.AnnualAprPercent);
                if (interest > 0m)
                {
                    state.Balance += interest;
                    monthDebts[state.ClientDebtId].InterestCharged += interest;
                    monthInterest += interest;
                    totalInterest += interest;
                }
            }

            var remainingBudget = monthlyBudget;
            foreach (var state in states.Where(state => state.Balance > 0m))
            {
                var payment = Math.Min(state.MinimumPayment, state.Balance);
                var monthDebt = monthDebts[state.ClientDebtId];
                ApplyDebtPayment(state, monthDebt, payment);
                monthDebt.MinimumPaymentApplied += payment;
                remainingBudget -= payment;
                monthPayment += payment;
                totalPaid += payment;
            }

            while (remainingBudget > 0m)
            {
                var target = states
                    .Where(state => state.Balance > 0m)
                    .OrderBy(state => state.Priority)
                    .FirstOrDefault();
                if (target is null)
                {
                    break;
                }

                var payment = Math.Min(remainingBudget, target.Balance);
                var monthDebt = monthDebts[target.ClientDebtId];
                monthDebt.IsTargeted = true;
                monthDebt.ExtraPaymentApplied += payment;
                ApplyDebtPayment(target, monthDebt, payment);
                remainingBudget -= payment;
                monthPayment += payment;
                totalPaid += payment;
            }

            foreach (var monthDebt in monthDebts.Values)
            {
                var state = states.Single(item => item.ClientDebtId == monthDebt.ClientDebtId);
                monthDebt.EndingBalance = state.Balance;
                if (monthDebt.StartingBalance > 0m && state.Balance <= 0m && !state.PayoffMonth.HasValue)
                {
                    state.PayoffMonth = months;
                    monthDebt.IsPaidOffThisMonth = true;
                }
            }

            timeline.Add(new DebtStrategyMonthResult(
                MonthNumber: months,
                StartingBalance: RoundCurrency(monthStartingBalance),
                InterestCharged: RoundCurrency(monthInterest),
                PaymentApplied: RoundCurrency(monthPayment),
                EndingBalance: RoundCurrency(states.Sum(state => state.Balance)),
                Debts: monthDebts.Values
                    .OrderBy(debt => states.Single(state => state.ClientDebtId == debt.ClientDebtId).Priority)
                    .Select(debt => new DebtStrategyMonthDebtResult(
                        debt.ClientDebtId,
                        debt.Name,
                        RoundCurrency(debt.StartingBalance),
                        RoundCurrency(debt.InterestCharged),
                        RoundCurrency(debt.PaymentApplied),
                        RoundCurrency(debt.MinimumPaymentApplied),
                        RoundCurrency(debt.ExtraPaymentApplied),
                        RoundCurrency(debt.EndingBalance),
                        debt.IsTargeted,
                        debt.IsPaidOffThisMonth))
                    .ToList()));
        }

        var roundedTotalPaid = RoundCurrency(totalPaid);
        var roundedTotalInterest = RoundCurrency(totalInterest);

        return new DebtStrategyPlanResult(
            Strategy: strategy,
            MonthsToPayoff: months,
            TotalPaid: roundedTotalPaid,
            TotalInterestPaid: roundedTotalInterest,
            TotalPaidDisplay: Conversions.ConvertDecimalToCurrency(roundedTotalPaid),
            TotalInterestDisplay: Conversions.ConvertDecimalToCurrency(roundedTotalInterest),
            FinalPayoffDateLabel: FormatMonthLabel(months),
            PayoffOrder: states
                .OrderBy(state => state.Priority)
                .Select(state => new DebtStrategyPayoffOrderItem(
                    state.ClientDebtId,
                    state.Name,
                    state.PayoffMonth ?? months,
                    RoundCurrency(state.StartingBalance),
                    state.AnnualAprPercent))
                .ToList(),
            Timeline: timeline);
    }

    private static decimal CalculateMonthlyInterest(decimal balance, decimal annualAprPercent)
    {
        if (annualAprPercent <= 0m)
        {
            return 0m;
        }

        var monthlyRate = decimal.Divide(Conversions.ConvertPercentageToDecimal(annualAprPercent), 12m);
        return decimal.Round(balance * monthlyRate, 10, MidpointRounding.ToEven);
    }

    private static void ApplyDebtPayment(
        DebtSimulationState state,
        DebtStrategyMonthDebtAccumulator monthDebt,
        decimal payment)
    {
        if (payment <= 0m)
        {
            return;
        }

        state.Balance -= payment;
        if (state.Balance < 0.0000000001m)
        {
            state.Balance = 0m;
        }

        monthDebt.PaymentApplied += payment;
    }

    private static decimal RoundCurrency(decimal value)
        => decimal.Round(value, 2, MidpointRounding.ToEven);

    private static string FormatMonthLabel(int months)
    {
        var years = months / 12;
        var remainingMonths = months % 12;

        return (years, remainingMonths) switch
        {
            (0, 1) => "1 month",
            (0, _) => $"{remainingMonths} months",
            (1, 0) => "1 year",
            (1, 1) => "1 year, 1 month",
            (1, _) => $"1 year, {remainingMonths} months",
            (_, 0) => $"{years} years",
            (_, 1) => $"{years} years, 1 month",
            _ => $"{years} years, {remainingMonths} months"
        };
    }

    private sealed class DebtSimulationState
    {
        public DebtSimulationState(
            string clientDebtId,
            string name,
            decimal startingBalance,
            decimal annualAprPercent,
            decimal minimumPayment,
            int priority)
        {
            ClientDebtId = clientDebtId;
            Name = name;
            StartingBalance = startingBalance;
            Balance = startingBalance;
            AnnualAprPercent = annualAprPercent;
            MinimumPayment = minimumPayment;
            Priority = priority;
        }

        public string ClientDebtId { get; }

        public string Name { get; }

        public decimal StartingBalance { get; }

        public decimal Balance { get; set; }

        public decimal AnnualAprPercent { get; }

        public decimal MinimumPayment { get; }

        public int Priority { get; }

        public int? PayoffMonth { get; set; }
    }

    private sealed class DebtStrategyMonthDebtAccumulator
    {
        public DebtStrategyMonthDebtAccumulator(string clientDebtId, string name, decimal startingBalance)
        {
            ClientDebtId = clientDebtId;
            Name = name;
            StartingBalance = startingBalance;
            EndingBalance = startingBalance;
        }

        public string ClientDebtId { get; }

        public string Name { get; }

        public decimal StartingBalance { get; }

        public decimal InterestCharged { get; set; }

        public decimal PaymentApplied { get; set; }

        public decimal MinimumPaymentApplied { get; set; }

        public decimal ExtraPaymentApplied { get; set; }

        public decimal EndingBalance { get; set; }

        public bool IsTargeted { get; set; }

        public bool IsPaidOffThisMonth { get; set; }
    }
}
