namespace CompoundCalc.Models.Responses;

public sealed record DebtStrategyResult(
    decimal MonthlyBudget,
    decimal TotalMinimumPayment,
    string RecommendedStrategy,
    DebtStrategyPlanResult Snowball,
    DebtStrategyPlanResult Avalanche,
    string CalculationVersion);

public sealed record DebtStrategyPlanResult(
    string Strategy,
    int MonthsToPayoff,
    decimal TotalPaid,
    decimal TotalInterestPaid,
    string TotalPaidDisplay,
    string TotalInterestDisplay,
    string FinalPayoffDateLabel,
    IReadOnlyList<DebtStrategyPayoffOrderItem> PayoffOrder,
    IReadOnlyList<DebtStrategyMonthResult> Timeline);

public sealed record DebtStrategyPayoffOrderItem(
    string ClientDebtId,
    string Name,
    int PayoffMonth,
    decimal StartingBalance,
    decimal AnnualAprPercent);

public sealed record DebtStrategyMonthResult(
    int MonthNumber,
    decimal StartingBalance,
    decimal InterestCharged,
    decimal PaymentApplied,
    decimal EndingBalance,
    IReadOnlyList<DebtStrategyMonthDebtResult> Debts);

public sealed record DebtStrategyMonthDebtResult(
    string ClientDebtId,
    string Name,
    decimal StartingBalance,
    decimal InterestCharged,
    decimal PaymentApplied,
    decimal MinimumPaymentApplied,
    decimal ExtraPaymentApplied,
    decimal EndingBalance,
    bool IsTargeted,
    bool IsPaidOffThisMonth);
