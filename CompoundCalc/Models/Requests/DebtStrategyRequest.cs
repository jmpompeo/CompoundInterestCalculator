namespace CompoundCalc.Models.Requests;

public sealed class DebtStrategyRequest
{
    public DebtStrategyRequest(decimal monthlyBudget, IReadOnlyCollection<DebtStrategyDebtRequest> debts)
    {
        MonthlyBudget = monthlyBudget;
        Debts = debts ?? throw new ArgumentNullException(nameof(debts));

        Validate();
    }

    public decimal MonthlyBudget { get; }

    public IReadOnlyCollection<DebtStrategyDebtRequest> Debts { get; }

    private void Validate()
    {
        if (MonthlyBudget <= 0m)
        {
            throw new ArgumentOutOfRangeException(nameof(MonthlyBudget), "Monthly budget must be greater than zero.");
        }

        if (Debts.Count is < 1 or > 50)
        {
            throw new ArgumentOutOfRangeException(nameof(Debts), "Provide between 1 and 50 debts.");
        }
    }
}

public sealed class DebtStrategyDebtRequest
{
    public DebtStrategyDebtRequest(
        string clientDebtId,
        string name,
        decimal currentBalance,
        decimal annualAprPercent,
        decimal minimumPayment)
    {
        if (string.IsNullOrWhiteSpace(clientDebtId))
        {
            throw new ArgumentException("Debt id is required.", nameof(clientDebtId));
        }

        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Debt name is required.", nameof(name));
        }

        if (currentBalance <= 0m)
        {
            throw new ArgumentOutOfRangeException(nameof(currentBalance), "Current balance must be greater than zero.");
        }

        if (annualAprPercent < 0m || annualAprPercent > 100m)
        {
            throw new ArgumentOutOfRangeException(nameof(annualAprPercent), "Annual APR percent must be between 0 and 100.");
        }

        if (minimumPayment <= 0m)
        {
            throw new ArgumentOutOfRangeException(nameof(minimumPayment), "Minimum payment must be greater than zero.");
        }

        ClientDebtId = clientDebtId.Trim();
        Name = name.Trim();
        CurrentBalance = currentBalance;
        AnnualAprPercent = annualAprPercent;
        MinimumPayment = minimumPayment;
    }

    public string ClientDebtId { get; }

    public string Name { get; }

    public decimal CurrentBalance { get; }

    public decimal AnnualAprPercent { get; }

    public decimal MinimumPayment { get; }
}
