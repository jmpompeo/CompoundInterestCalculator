using CompoundInterestCalculator.Helpers;

namespace CompoundInterestCalculator.Services
{
    public class Calculations
    {
         public string GetYearlyAmountWithInterest(double startingBalance, double interestPercentage, int years)
         {
            var percentConversion = Conversions.ConvertPercentageToDecimal(interestPercentage);

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
            double.TryParse(Console.ReadLine(), out var startingBalance);

            Console.WriteLine("Insert a interest rate");
            double.TryParse(Console.ReadLine(), out var interestRate);

            Console.WriteLine("Enter number of years");
            int.TryParse(Console.ReadLine(), out var years);

            GetYearlyAmountWithInterest(startingBalance, interestRate, years);
        }
    }
}
