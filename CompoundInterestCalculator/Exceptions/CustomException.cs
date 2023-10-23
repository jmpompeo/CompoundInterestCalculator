using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CompoundInterestCalculator.Exceptions
{
    public class CustomException : Exception
    {
        public List<Exception>? Exceptions { get; set; }

        public CustomException(List<Exception> exceptions) : base("Multiple exceptions may have occured")
        {
            Exceptions = exceptions;
        }
    }
}
