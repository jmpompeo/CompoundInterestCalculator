namespace CompoundCalc.Models.Responses;

public sealed record CalculationResult(
    decimal StartingPrincipal,
    decimal AnnualRatePercent,
    string CompoundingCadence,
    int DurationYears,
    decimal EndingBalance,
    string CurrencyDisplay,
    string CalculationVersion)
{
    public static CalculationResult Create(
        decimal startingPrincipal,
        decimal annualRatePercent,
        string compoundingCadence,
        int durationYears,
        decimal endingBalance,
        Func<decimal, string> currencyFormatter,
        string calculationVersion)
    {
        var roundedEndingBalance = Math.Round(endingBalance, 2, MidpointRounding.ToEven);
        return new CalculationResult(
            StartingPrincipal: startingPrincipal,
            AnnualRatePercent: annualRatePercent,
            CompoundingCadence: compoundingCadence,
            DurationYears: durationYears,
            EndingBalance: roundedEndingBalance,
            CurrencyDisplay: currencyFormatter(roundedEndingBalance),
            CalculationVersion: calculationVersion);
    }
}
