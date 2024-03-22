using System.Text.RegularExpressions;

namespace CompoundInterestCalculator.Helpers
{
    public static partial class InputCheck
    {
        public static string CheckInput(string input)
        {
            if (!MyRegex().IsMatch(input))
                throw new NotSupportedException("Input must only contains numbers");

            if (string.IsNullOrEmpty(input))
                throw new NullReferenceException("Input cannot be null");

            return input;
        }

        [GeneratedRegex("^[0-9]*$")]
        private static partial Regex MyRegex();
    }
}
