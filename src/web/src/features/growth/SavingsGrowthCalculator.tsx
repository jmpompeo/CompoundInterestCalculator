import { FormEvent, useMemo, useState } from 'react';
import CalculatorWorkspace from '../../components/CalculatorWorkspace';
import ResultSummaryGrid from '../../components/ResultSummaryGrid';
import TraceInfoPanel from '../../components/TraceInfoPanel';
import {
  cadenceOptions,
  CalculationResponse,
  GrowthFormState,
  initialSavingsForm,
  ValidationProblemDetails
} from './growthShared';
import { preventInvalidNumericInput } from '../../utils/numberUtils';

type SavingsRequest = {
  principal: number;
  annualRatePercent: number;
  compoundingCadence: string;
  durationYears: number;
  clientReference?: string;
  requestedAt?: string;
};

export default function SavingsGrowthCalculator() {
  const [form, setForm] = useState<GrowthFormState>(initialSavingsForm);
  const [result, setResult] = useState<CalculationResponse | null>(null);
  const [status, setStatus] = useState<'idle' | 'submitting'>('idle');
  const [error, setError] = useState<string | null>(null);

  const isSubmitting = status === 'submitting';

  const summary = useMemo(() => {
    if (!result) {
      return [];
    }

    return [
      { label: 'Starting balance', value: result.startingPrincipal.toLocaleString(undefined, { style: 'currency', currency: 'USD' }) },
      { label: 'Rate', value: `${result.annualRatePercent}%` },
      { label: 'Cadence', value: result.compoundingCadence },
      { label: 'Duration', value: `${result.durationYears} years` }
    ];
  }, [result]);

  const handleChange = (name: keyof GrowthFormState, value: string) => {
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setStatus('submitting');

    const payload: SavingsRequest = {
      principal: Number(form.principal),
      annualRatePercent: Number(form.annualRatePercent),
      durationYears: Number(form.durationYears),
      compoundingCadence: form.compoundingCadence,
      clientReference: form.clientReference.trim() || undefined,
      requestedAt: new Date().toISOString()
    };

    try {
      const response = await fetch('/api/v1/growth/savings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const problem = (await response.json()) as ValidationProblemDetails;
        if (problem.errors) {
          throw new Error(Object.values(problem.errors).flat().join(' '));
        }

        throw new Error(problem.detail ?? problem.title ?? 'Unable to calculate growth.');
      }

      const body = (await response.json()) as CalculationResponse;
      setResult(body);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unexpected error occurred.');
      setResult(null);
    } finally {
      setStatus('idle');
    }
  };

  return (
    <CalculatorWorkspace
      inputTitle="Savings inputs"
      inputDescription="Project a fixed balance with compounding over time."
      onReset={() => {
        setForm({ ...initialSavingsForm });
        setResult(null);
        setError(null);
      }}
      emptyStateTitle="No calculation yet"
      emptyStateDescription="Fill out the form and click “Calculate growth” to see the projection."
      form={
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-200">Starting balance ($)</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                onKeyDown={preventInvalidNumericInput}
                className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-base text-white focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                value={form.principal}
                onChange={event => handleChange('principal', event.target.value)}
                required
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-200">Annual rate (%)</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step={0.01}
                onKeyDown={preventInvalidNumericInput}
                className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-base text-white focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                value={form.annualRatePercent}
                onChange={event => handleChange('annualRatePercent', event.target.value)}
                required
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-200">Years</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={99}
                step={1}
                onKeyDown={preventInvalidNumericInput}
                className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-base text-white focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                value={form.durationYears}
                onChange={event => handleChange('durationYears', event.target.value)}
                required
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-200">Client reference (optional)</span>
              <input
                type="text"
                maxLength={64}
                className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-base text-white focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                value={form.clientReference}
                onChange={event => handleChange('clientReference', event.target.value)}
              />
            </label>
          </div>

          <div>
            <span className="text-sm font-medium text-slate-200">Compounding cadence</span>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {cadenceOptions.map(option => {
                const active = form.compoundingCadence === option.value;
                return (
                  <button
                    type="button"
                    key={option.value}
                    className={`rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
                      active
                        ? 'border-brand-400 bg-brand-500/10 text-brand-100'
                        : 'border-slate-800/80 bg-slate-950/40 text-slate-300 hover:border-brand-700/40'
                    }`}
                    onClick={() => handleChange('compoundingCadence', option.value)}
                  >
                    <p className="text-sm font-semibold">{option.label}</p>
                    <p className="text-xs text-slate-400">{option.helper}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-2xl bg-brand-500 px-6 py-3 text-base font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-500/50"
            >
              {isSubmitting ? 'Calculating…' : 'Calculate growth'}
            </button>
            <a
              href="/swagger"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-6 py-3 text-base font-semibold text-slate-200 hover:border-brand-500/40"
            >
              API docs
            </a>
          </div>
        </form>
      }
      result={
        result ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-brand-500/40 bg-brand-500/10 p-5">
              <p className="text-sm uppercase tracking-wide text-brand-200">Ending balance</p>
              <p className="text-4xl font-bold text-white">{result.currencyDisplay}</p>
              <p className="text-xs text-slate-300">Calculated at {new Date(result.calculatedAt).toLocaleString()}</p>
            </div>

            <ResultSummaryGrid items={summary} />
            <TraceInfoPanel
              responseId={result.responseId}
              traceId={result.traceId}
              clientReference={result.clientReference}
            />
          </div>
        ) : null
      }
    />
  );
}
