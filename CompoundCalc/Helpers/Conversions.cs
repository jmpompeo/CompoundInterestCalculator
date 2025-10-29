using System.Globalization;

namespace CompoundCalc.Helpers
{
    public static class Conversions
    {
        private static readonly CultureInfo UsCultureInfo = new("en-US");

        public static decimal ConvertPercentageToDecimal(decimal interestPercentage)
            => decimal.Divide(interestPercentage, 100m);

        public static string ConvertDecimalToCurrency(decimal money)
            => money.ToString("C", UsCultureInfo);
    }
}
