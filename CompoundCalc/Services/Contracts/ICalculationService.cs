using CompoundCalc.Models.Requests;
using CompoundCalc.Models.Responses;

namespace CompoundCalc.Services.Contracts;

public interface ICalculationService
{
    CalculationResult CalculateCompoundInterest(InterestCalcReq request);
}
