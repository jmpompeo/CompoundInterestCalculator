using System.Globalization;

namespace CompoundCalc.Helpers
{
    public static class Conversions
    {
        public static double ConvertPercentageToDecimal(double interestPercentage)
            => interestPercentage / 100;

        public static string ConvertDoubleToCurrency(double money)
        {
            var cultureInfo = new CultureInfo("en-US");

            var stringAmount = money.ToString("C", cultureInfo);

            return stringAmount;
        }
    }
}
