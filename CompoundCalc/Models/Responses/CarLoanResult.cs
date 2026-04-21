namespace CompoundCalc.Models.Responses;

public sealed record CarLoanAmortizationEntry(
    int Month,
    decimal Payment,
    decimal Principal,
    decimal Interest,
    decimal RemainingBalance);

public sealed record CarLoanResult(
    decimal VehiclePrice,
    decimal CashDownPayment,
    decimal TradeInValue,
    decimal TradeInPayoff,
    decimal NetTradeInCredit,
    decimal TotalUpfrontCredit,
    decimal SalesTax,
    decimal Fees,
    decimal Rebate,
    decimal FinancedExtras,
    decimal AmountFinanced,
    decimal AnnualRatePercent,
    int TermMonths,
    decimal MonthlyPayment,
    decimal TotalPaid,
    decimal TotalInterest,
    string AmountFinancedDisplay,
    string MonthlyPaymentDisplay,
    string TotalPaidDisplay,
    string TotalInterestDisplay,
    string TotalUpfrontCreditDisplay,
    string NetTradeInCreditDisplay,
    string CalculationVersion,
    IReadOnlyList<CarLoanAmortizationEntry> AmortizationSchedule)
{
    public static CarLoanResult Create(
        decimal vehiclePrice,
        decimal cashDownPayment,
        decimal tradeInValue,
        decimal tradeInPayoff,
        decimal netTradeInCredit,
        decimal totalUpfrontCredit,
        decimal salesTax,
        decimal fees,
        decimal rebate,
        decimal financedExtras,
        decimal amountFinanced,
        decimal annualRatePercent,
        int termMonths,
        decimal monthlyPayment,
        decimal totalPaid,
        decimal totalInterest,
        IReadOnlyList<CarLoanAmortizationEntry> amortizationSchedule,
        Func<decimal, string> currencyFormatter,
        string calculationVersion)
    {
        var roundedAmountFinanced = Math.Round(amountFinanced, 2, MidpointRounding.ToEven);
        var roundedMonthlyPayment = Math.Round(monthlyPayment, 2, MidpointRounding.ToEven);
        var roundedTotalPaid = Math.Round(totalPaid, 2, MidpointRounding.ToEven);
        var roundedTotalInterest = Math.Round(totalInterest, 2, MidpointRounding.ToEven);
        var roundedTotalUpfrontCredit = Math.Round(totalUpfrontCredit, 2, MidpointRounding.ToEven);
        var roundedNetTradeInCredit = Math.Round(netTradeInCredit, 2, MidpointRounding.ToEven);

        return new CarLoanResult(
            VehiclePrice: vehiclePrice,
            CashDownPayment: cashDownPayment,
            TradeInValue: tradeInValue,
            TradeInPayoff: tradeInPayoff,
            NetTradeInCredit: roundedNetTradeInCredit,
            TotalUpfrontCredit: roundedTotalUpfrontCredit,
            SalesTax: Math.Round(salesTax, 2, MidpointRounding.ToEven),
            Fees: Math.Round(fees, 2, MidpointRounding.ToEven),
            Rebate: Math.Round(rebate, 2, MidpointRounding.ToEven),
            FinancedExtras: Math.Round(financedExtras, 2, MidpointRounding.ToEven),
            AmountFinanced: roundedAmountFinanced,
            AnnualRatePercent: annualRatePercent,
            TermMonths: termMonths,
            MonthlyPayment: roundedMonthlyPayment,
            TotalPaid: roundedTotalPaid,
            TotalInterest: roundedTotalInterest,
            AmountFinancedDisplay: currencyFormatter(roundedAmountFinanced),
            MonthlyPaymentDisplay: currencyFormatter(roundedMonthlyPayment),
            TotalPaidDisplay: currencyFormatter(roundedTotalPaid),
            TotalInterestDisplay: currencyFormatter(roundedTotalInterest),
            TotalUpfrontCreditDisplay: currencyFormatter(roundedTotalUpfrontCredit),
            NetTradeInCreditDisplay: currencyFormatter(roundedNetTradeInCredit),
            CalculationVersion: calculationVersion,
            AmortizationSchedule: amortizationSchedule);
    }
}
