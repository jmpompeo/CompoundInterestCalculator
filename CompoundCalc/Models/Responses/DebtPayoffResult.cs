namespace CompoundCalc.Models.Responses;

public sealed record DebtPayoffResult(
    decimal StartingDebt,
    decimal MonthlyPayment,
    decimal MonthlyRatePercent,
    decimal MinimumPaymentRequired,
    string MinimumPaymentDisplay,
    int MonthsToPayoff,
    decimal TotalPaid,
    decimal TotalInterestPaid,
    string TotalPaidDisplay,
    string TotalInterestDisplay,
    string CalculationVersion)
{
    public static DebtPayoffResult Create(
        decimal startingDebt,
        decimal monthlyPayment,
        decimal monthlyRatePercent,
        decimal minimumPaymentRequired,
        int monthsToPayoff,
        decimal totalPaid,
        decimal totalInterestPaid,
        Func<decimal, string> currencyFormatter,
        string calculationVersion)
    {
        var roundedTotalPaid = Math.Round(totalPaid, 2, MidpointRounding.ToEven);
        var roundedTotalInterest = Math.Round(totalInterestPaid, 2, MidpointRounding.ToEven);
        var roundedMinimumPayment = Math.Round(minimumPaymentRequired, 2, MidpointRounding.ToEven);

        return new DebtPayoffResult(
            StartingDebt: startingDebt,
            MonthlyPayment: monthlyPayment,
            MonthlyRatePercent: monthlyRatePercent,
            MinimumPaymentRequired: roundedMinimumPayment,
            MinimumPaymentDisplay: currencyFormatter(roundedMinimumPayment),
            MonthsToPayoff: monthsToPayoff,
            TotalPaid: roundedTotalPaid,
            TotalInterestPaid: roundedTotalInterest,
            TotalPaidDisplay: currencyFormatter(roundedTotalPaid),
            TotalInterestDisplay: currencyFormatter(roundedTotalInterest),
            CalculationVersion: calculationVersion);
    }
}
