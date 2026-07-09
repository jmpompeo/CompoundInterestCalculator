import { ReactNode } from 'react';

type CalculatorWorkspaceProps = {
  inputTitle: string;
  inputDescription: string;
  onReset: () => void;
  form: ReactNode;
  result: ReactNode | null;
  resultsEyebrow?: string;
  resultsTitle?: string;
  emptyStateTitle: string;
  emptyStateDescription: string;
};

export default function CalculatorWorkspace({
  inputTitle,
  inputDescription,
  onReset,
  form,
  result,
  resultsEyebrow = 'Results',
  resultsTitle = 'Projection',
  emptyStateTitle,
  emptyStateDescription
}: CalculatorWorkspaceProps) {
  return (
    <main className="grid gap-6 lg:grid-cols-[3fr,2fr]">
      <section className="rounded-3xl border border-slate-800/70 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/40">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">{inputTitle}</h2>
            <p className="text-sm text-slate-400">{inputDescription}</p>
          </div>
          <button
            type="button"
            className="text-sm font-medium text-brand-300 transition hover:text-brand-200"
            onClick={onReset}
          >
            Reset
          </button>
        </div>

        {form}
      </section>

      <section className="flex flex-col gap-5 rounded-3xl border border-slate-800/60 bg-slate-900/55 p-6 shadow-inner shadow-black/20">
        <div>
          <p className="text-sm uppercase tracking-wide text-brand-300">{resultsEyebrow}</p>
          <h2 className="text-2xl font-semibold text-white">{resultsTitle}</h2>
        </div>

        {result ? (
          result
        ) : (
          <div className="flex h-full min-h-[18rem] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800/60 bg-slate-950/30 p-8 text-center text-slate-400">
            <p className="text-base font-medium text-slate-200">{emptyStateTitle}</p>
            <p className="text-sm">{emptyStateDescription}</p>
          </div>
        )}
      </section>
    </main>
  );
}
