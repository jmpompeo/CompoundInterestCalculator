using CompoundInterestCalculator.Services;

internal class Program
{
    private static void Main(string[] args)
    {
        Console.WriteLine("Insert a number");
        double.TryParse(Console.ReadLine(), out var num1);

        Console.WriteLine("Insert a number");
        double.TryParse(Console.ReadLine(), out var num2);

        Console.WriteLine("Enter number of years");
        int.TryParse(Console.ReadLine(), out var num3);

        var calculations = new Calculations();
        var result = calculations.GetYearlyAmountWithInterest(num1, num2, num3);

        Console.WriteLine($"Your starting balance: ${num1}. Your interest rate: {num2}%. Your ending balance after 5 years :{result}");
    }
}