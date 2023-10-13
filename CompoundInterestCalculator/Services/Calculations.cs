namespace CompoundInterestCalculator.Services
{
    public class Calculations
    {
        public string GetYearlyAmountWithInterest(double startingBalance, double interestPercentage, int years)
        {
            var percentConversion = Helpers.Conversions.ConvertPercentageToDecimal(interestPercentage);
            
            for (int i = 0; i < years; i++)
            {
                var interest = startingBalance * percentConversion;
                startingBalance += interest;                
            }

            return Helpers.Conversions.ConvertDoubleToCurrency(startingBalance);
        }        
    }
}
