using CompoundCalc.Models.Requests;
using CompoundCalc.Models.Responses;

namespace CompoundCalc.Services.Contracts;

public interface ICalculationService
{
    CalculationResult CalculateContributionGrowth(InterestCalcReq request);
    CalculationResult CalculateSavingsGrowth(SavingsCalcReq request);
    DebtPayoffResult CalculateDebtPayoff(DebtPayoffRequest request);
}
