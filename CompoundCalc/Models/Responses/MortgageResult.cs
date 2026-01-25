namespace CompoundCalc.Models.Responses;

public sealed record MortgageResult(
    decimal HomePrice,
    decimal DownPayment,
    decimal LoanAmount,
    decimal AnnualRatePercent,
    int TermYears,
    decimal MonthlyPrincipalAndInterest,
    decimal MonthlyPropertyTax,
    decimal MonthlyPmi,
    decimal MonthlyTotalPayment,
    decimal TotalPaid,
    decimal TotalInterest,
    string LoanAmountDisplay,
    string MonthlyPrincipalAndInterestDisplay,
    string MonthlyPropertyTaxDisplay,
    string MonthlyPmiDisplay,
    string MonthlyTotalPaymentDisplay,
    string TotalPaidDisplay,
    string TotalInterestDisplay,
    string CalculationVersion)
{
    public static MortgageResult Create(
        decimal homePrice,
        decimal downPayment,
        decimal loanAmount,
        decimal annualRatePercent,
        int termYears,
        decimal monthlyPrincipalAndInterest,
        decimal monthlyPropertyTax,
        decimal monthlyPmi,
        decimal monthlyTotalPayment,
        decimal totalPaid,
        decimal totalInterest,
        Func<decimal, string> currencyFormatter,
        string calculationVersion)
    {
        var roundedLoanAmount = Math.Round(loanAmount, 2, MidpointRounding.ToEven);
        var roundedMonthlyPrincipalAndInterest = Math.Round(monthlyPrincipalAndInterest, 2, MidpointRounding.ToEven);
        var roundedMonthlyPropertyTax = Math.Round(monthlyPropertyTax, 2, MidpointRounding.ToEven);
        var roundedMonthlyPmi = Math.Round(monthlyPmi, 2, MidpointRounding.ToEven);
        var roundedMonthlyTotal = Math.Round(monthlyTotalPayment, 2, MidpointRounding.ToEven);
        var roundedTotalPaid = Math.Round(totalPaid, 2, MidpointRounding.ToEven);
        var roundedTotalInterest = Math.Round(totalInterest, 2, MidpointRounding.ToEven);

        return new MortgageResult(
            HomePrice: homePrice,
            DownPayment: downPayment,
            LoanAmount: roundedLoanAmount,
            AnnualRatePercent: annualRatePercent,
            TermYears: termYears,
            MonthlyPrincipalAndInterest: roundedMonthlyPrincipalAndInterest,
            MonthlyPropertyTax: roundedMonthlyPropertyTax,
            MonthlyPmi: roundedMonthlyPmi,
            MonthlyTotalPayment: roundedMonthlyTotal,
            TotalPaid: roundedTotalPaid,
            TotalInterest: roundedTotalInterest,
            LoanAmountDisplay: currencyFormatter(roundedLoanAmount),
            MonthlyPrincipalAndInterestDisplay: currencyFormatter(roundedMonthlyPrincipalAndInterest),
            MonthlyPropertyTaxDisplay: currencyFormatter(roundedMonthlyPropertyTax),
            MonthlyPmiDisplay: currencyFormatter(roundedMonthlyPmi),
            MonthlyTotalPaymentDisplay: currencyFormatter(roundedMonthlyTotal),
            TotalPaidDisplay: currencyFormatter(roundedTotalPaid),
            TotalInterestDisplay: currencyFormatter(roundedTotalInterest),
            CalculationVersion: calculationVersion);
    }
}
