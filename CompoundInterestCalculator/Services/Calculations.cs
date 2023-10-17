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
    }
}
