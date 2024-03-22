using CompoundCalc.Models.Requests;
using CompoundInterestCalculator.Helpers;

namespace CompoundInterestCalculator.Services
{
    public class CalculationService
    {
        public string GetYearlyAmountWithInterest(InterestCalcReq req)
        {
            var percentConversion = Conversions.
                ConvertPercentageToDecimal(req.InterestRate);

            for (int i = 0; i < req.Years; i++)
            {
                var interest = req.StartingBalance * percentConversion;
                req.StartingBalance += interest;
            }

            return Conversions.ConvertDoubleToCurrency(req.StartingBalance);
        }
    }
}
