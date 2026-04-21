import { useState } from 'react';
import CalculatorPage from './CalculatorPage';
import ExpenseTrackerPage from './ExpenseTrackerPage';
import DebtLogPage from './DebtLogPage';
import CarPaymentPage from './CarPaymentPage';

type AppPage = 'calculator' | 'car-payment' | 'budget' | 'debt-log';

export default function App() {
  const [page, setPage] = useState<AppPage>('calculator');

  return (
    <div>
      <nav className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => setPage('calculator')}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              page === 'calculator'
                ? 'bg-brand-500/20 text-brand-100 ring-1 ring-brand-400/50'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
          >
            Interest calculator
          </button>
          <button
            type="button"
            onClick={() => setPage('car-payment')}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              page === 'car-payment'
                ? 'bg-brand-500/20 text-brand-100 ring-1 ring-brand-400/50'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
          >
            Car payment
          </button>
          <button
            type="button"
            onClick={() => setPage('budget')}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              page === 'budget'
                ? 'bg-brand-500/20 text-brand-100 ring-1 ring-brand-400/50'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
          >
            Budget tracker
          </button>
          <button
            type="button"
            onClick={() => setPage('debt-log')}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              page === 'debt-log'
                ? 'bg-brand-500/20 text-brand-100 ring-1 ring-brand-400/50'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
          >
            Debt log
          </button>
        </div>
      </nav>

      {page === 'calculator' ? (
        <CalculatorPage />
      ) : page === 'car-payment' ? (
        <CarPaymentPage />
      ) : page === 'budget' ? (
        <ExpenseTrackerPage />
      ) : (
        <DebtLogPage />
      )}
    </div>
  );
}
