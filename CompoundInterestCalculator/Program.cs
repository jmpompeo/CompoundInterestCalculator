using CompoundInterestCalculator.Services;

internal class Program
{
    private static void Main(string[] args)
    {
        var calculations = new CalculationService();

        calculations.Operations();
    }
}