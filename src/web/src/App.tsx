import { useState } from 'react';
import CalculatorPage from './CalculatorPage';
import ExpenseTrackerPage from './ExpenseTrackerPage';

type AppPage = 'calculator' | 'budget';

export default function App() {
  const [page, setPage] = useState<AppPage>('calculator');

  return (
    <div>
      <nav className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl gap-3 px-4 py-3">
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
            onClick={() => setPage('budget')}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              page === 'budget'
                ? 'bg-brand-500/20 text-brand-100 ring-1 ring-brand-400/50'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
          >
            Budget tracker
          </button>
        </div>
      </nav>

      {page === 'calculator' ? <CalculatorPage /> : <ExpenseTrackerPage />}
    </div>
  );
}
