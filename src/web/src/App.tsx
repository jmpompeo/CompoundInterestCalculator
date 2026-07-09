import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell';
import CalculatorPage from './CalculatorPage';
import ExpenseTrackerPage from './ExpenseTrackerPage';
import DebtLogPage from './DebtLogPage';
import CarPaymentPage from './CarPaymentPage';
import LoansPage from './LoansPage';
import ContributionGrowthCalculator from './features/growth/ContributionGrowthCalculator';
import SavingsGrowthCalculator from './features/growth/SavingsGrowthCalculator';
import MortgageCalculator from './features/loans/MortgageCalculator';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/growth/contribution" replace />} />

        <Route path="growth" element={<CalculatorPage />}>
          <Route index element={<Navigate to="contribution" replace />} />
          <Route path="contribution" element={<ContributionGrowthCalculator />} />
          <Route path="savings" element={<SavingsGrowthCalculator />} />
        </Route>

        <Route path="loans" element={<LoansPage />}>
          <Route index element={<Navigate to="car" replace />} />
          <Route path="car" element={<CarPaymentPage />} />
          <Route path="mortgage" element={<MortgageCalculator />} />
        </Route>

        <Route path="budget" element={<ExpenseTrackerPage />} />
        <Route path="debt" element={<DebtLogPage />} />
        <Route path="*" element={<Navigate to="/growth/contribution" replace />} />
      </Route>
    </Routes>
  );
}
