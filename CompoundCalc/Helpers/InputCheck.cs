using System.Text.RegularExpressions;

namespace CompoundCalc.Helpers
{
    public static class InputCheck
    {
        public static string CheckInput(string input)
        {
            if (!Regex.IsMatch(input, "^[0-9]*$"))
                throw new NotSupportedException("Input must only contains numbers");

            if (string.IsNullOrEmpty(input))
                throw new NullReferenceException("Input cannot be null");

            return input;
        }
    }
}
