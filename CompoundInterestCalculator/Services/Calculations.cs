using CompoundInterestCalculator.Helpers;

namespace CompoundInterestCalculator.Services
{
    public class Calculations
    {
        public string GetYearlyAmountWithInterest(double startingBalance,
            double interestPercentage, int years)
        {
            var percentConversion = Conversions.
                ConvertPercentageToDecimal(interestPercentage);

            for (int i = 0; i < years; i++)
            {
                var interest = startingBalance * percentConversion;
                startingBalance += interest;
            }

            return Conversions.ConvertDoubleToCurrency(startingBalance);
        }

        public void Operations()
        {
            Console.WriteLine("Insert a starting balance");
            var startingBalance = Console.ReadLine();
            InputCheck.CheckInput(startingBalance);
            double.TryParse(startingBalance, out double newBalance);

            Console.WriteLine("Insert a interest rate");
            var interestRate = Console.ReadLine();
            InputCheck.CheckInput(interestRate);
            double.TryParse(interestRate, out var interest);

            Console.WriteLine("Enter number of years");
            var years = Console.ReadLine();
            InputCheck.CheckInput(years);
            int.TryParse(years, out var numOfYears);

            GetYearlyAmountWithInterest(newBalance, interest, numOfYears);
        }
    }
}
