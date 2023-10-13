namespace CompoundInterestCalculator.Services
{
    public class Calculations
    {
        public string GetYearlyAmountWithInterest(double startingBalance, double interestPercentage)
        {
            double newBalance = 0;
            double endingBalance = 0;

            var percentConversion = Helpers.Conversions.ConvertPercentageToDecimal(interestPercentage);

            var interest = startingBalance * percentConversion;
            for (int i = 0; i < 5; i++)
            {
                newBalance = interest + startingBalance;
                endingBalance += newBalance + interest;
            }

            return Helpers.Conversions.ConvertDoubleToCurrency(newBalance);

        }
        
        // TODO: Need to find a way to do it with adding years as well
        
    }
}
