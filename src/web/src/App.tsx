import { FormEvent, KeyboardEvent, useMemo, useState } from 'react';

type ContributionRequest = {
  principal: number;
  annualRatePercent: number;
  compoundingCadence: string;
  durationYears: number;
  monthlyContribution: number;
  clientReference?: string;
  requestedAt?: string;
};

type SavingsRequest = {
  principal: number;
  annualRatePercent: number;
  compoundingCadence: string;
  durationYears: number;
  clientReference?: string;
  requestedAt?: string;
};

type DebtPayoffRequest = {
  totalDebt: number;
  monthlyPayment: number;
  monthlyRatePercent: number;
  clientReference?: string;
  requestedAt?: string;
};

type CalculationRequest = ContributionRequest | SavingsRequest;

type CalculationResponse = {
  startingPrincipal: number;
  annualRatePercent: number;
  compoundingCadence: string;
  durationYears: number;
  monthlyContribution: number;
  endingBalance: number;
  currencyDisplay: string;
  calculationVersion: string;
  traceId: string;
  responseId: string;
  clientReference?: string;
  requestedAt?: string;
  calculatedAt: string;
};

type DebtPayoffResponse = {
  startingDebt: number;
  monthlyPayment: number;
  monthlyRatePercent: number;
  minimumPaymentRequired: number;
  minimumPaymentDisplay: string;
  monthsToPayoff: number;
  totalPaid: number;
  totalInterestPaid: number;
  totalPaidDisplay: string;
  totalInterestDisplay: string;
  calculationVersion: string;
  traceId: string;
  responseId: string;
  clientReference?: string;
  requestedAt?: string;
  calculatedAt: string;
};

type ValidationProblemDetails = {
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
};

type GrowthFormState = {
  principal: string;
  annualRatePercent: string;
  durationYears: string;
  monthlyContribution: string;
  compoundingCadence: string;
  clientReference: string;
};

type DebtFormState = {
  totalDebt: string;
  monthlyPayment: string;
  monthlyRatePercent: string;
  clientReference: string;
};

type ResultState =
  | { kind: 'growth'; data: CalculationResponse }
  | { kind: 'debt'; data: DebtPayoffResponse };

const cadenceOptions = [
  { value: 'Annual', label: 'Annual', helper: 'Once per year' },
  { value: 'SemiAnnual', label: 'Semi-Annual', helper: 'Twice per year' },
  { value: 'Quarterly', label: 'Quarterly', helper: 'Four times per year' },
  { value: 'Monthly', label: 'Monthly', helper: 'Twelve times per year' }
];

type CalculatorMode = 'contribution' | 'savings' | 'debt';

const initialGrowthForm: GrowthFormState = {
  principal: '10000',
  annualRatePercent: '5.25',
  compoundingCadence: 'Annual',
  durationYears: '10',
  monthlyContribution: '100',
  clientReference: ''
};

const initialDebtForm: DebtFormState = {
  totalDebt: '5000',
  monthlyPayment: '250',
  monthlyRatePercent: '1.5',
  clientReference: ''
};

const preventInvalidNumericInput = (event: KeyboardEvent<HTMLInputElement>) => {
  if (['e', 'E', '+', '-'].includes(event.key)) {
    event.preventDefault();
  }
};

const parseNumber = (value: string): number | null => {
  if (value.trim() === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const computeMinimumPaymentRequirement = (totalDebt: number, monthlyRatePercent: number): number | null => {
  if (totalDebt <= 0 || monthlyRatePercent < 0 || monthlyRatePercent > 100) {
    return null;
  }

  if (monthlyRatePercent === 0) {
    return 0.01;
  }

  const monthlyRate = monthlyRatePercent / 100;
  const firstMonthInterest = Math.round(totalDebt * monthlyRate * 100) / 100;
  const minPayment = firstMonthInterest + 0.01;
  return Math.round(minPayment * 100) / 100;
};

export default function App() {
  const [growthForm, setGrowthForm] = useState(initialGrowthForm);
  const [debtForm, setDebtForm] = useState(initialDebtForm);
  const [result, setResult] = useState<ResultState | null>(null);
  const [status, setStatus] = useState<'idle' | 'submitting'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<CalculatorMode>('contribution');

  const isSubmitting = status === 'submitting';
  const isSavingsMode = mode === 'savings';
  const isDebtMode = mode === 'debt';
  const activeClientReference = isDebtMode ? debtForm.clientReference : growthForm.clientReference;
  const submitLabel = isDebtMode ? 'Calculate payoff' : 'Calculate growth';
  const minimumPaymentHint = useMemo(() => {
    if (!isDebtMode) {
      return null;
    }

    const totalDebtValue = parseNumber(debtForm.totalDebt);
    const rateValue = parseNumber(debtForm.monthlyRatePercent);
    if (totalDebtValue === null || rateValue === null) {
      return null;
    }

    const requirement = computeMinimumPaymentRequirement(totalDebtValue, rateValue);
    if (requirement === null) {
      return null;
    }

    return requirement.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  }, [isDebtMode, debtForm.totalDebt, debtForm.monthlyRatePercent]);

  const handleGrowthChange = (name: keyof GrowthFormState, value: string) => {
    setGrowthForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDebtChange = (name: keyof DebtFormState, value: string) => {
    setDebtForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setStatus('submitting');

    const currentMode = mode;
    const timestamp = new Date().toISOString();

    let endpoint: string;
    let payload: CalculationRequest | DebtPayoffRequest;

    if (currentMode === 'debt') {
      payload = {
        totalDebt: Number(debtForm.totalDebt),
        monthlyPayment: Number(debtForm.monthlyPayment),
        monthlyRatePercent: Number(debtForm.monthlyRatePercent),
        clientReference: debtForm.clientReference?.trim() || undefined,
        requestedAt: timestamp
      };
      endpoint = '/api/v1/debt/payoff';
    } else {
      const basePayload = {
        principal: Number(growthForm.principal),
        annualRatePercent: Number(growthForm.annualRatePercent),
        durationYears: Number(growthForm.durationYears),
        compoundingCadence: growthForm.compoundingCadence,
        clientReference: growthForm.clientReference?.trim() || undefined,
        requestedAt: timestamp
      };

      payload =
        currentMode === 'contribution'
          ? { ...basePayload, monthlyContribution: Number(growthForm.monthlyContribution) }
          : basePayload;

      endpoint = currentMode === 'contribution' ? '/api/v1/growth/contribution' : '/api/v1/growth/savings';
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const problem = (await response.json()) as ValidationProblemDetails;
        if (problem.errors) {
          const messages = Object.values(problem.errors).flat();
          throw new Error(messages.join(' '));
        }

        throw new Error(problem.detail ?? problem.title ?? 'Unable to calculate compound interest.');
      }

      const body = await response.json();
      if (currentMode === 'debt') {
        setResult({ kind: 'debt', data: body as DebtPayoffResponse });
      } else {
        setResult({ kind: 'growth', data: body as CalculationResponse });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error occurred.';
      setError(message);
      setResult(null);
    } finally {
      setStatus('idle');
    }
  };

  const summary = useMemo(() => {
    if (!result) {
      return null;
    }

    if (result.kind === 'growth') {
      const data = result.data;
      const monthlyContribution = data.monthlyContribution ?? 0;

      return [
        { label: 'Principal', value: data.startingPrincipal.toLocaleString(undefined, { style: 'currency', currency: 'USD' }) },
        { label: 'Rate', value: `${data.annualRatePercent}%` },
        { label: 'Cadence', value: data.compoundingCadence },
        { label: 'Duration', value: `${data.durationYears} years` },
        { label: 'Monthly Contribution', value: monthlyContribution.toLocaleString(undefined, { style: 'currency', currency: 'USD' }) }
      ];
    }

    const debt = result.data;
    return [
      { label: 'Starting debt', value: debt.startingDebt.toLocaleString(undefined, { style: 'currency', currency: 'USD' }) },
      { label: 'Monthly payment', value: debt.monthlyPayment.toLocaleString(undefined, { style: 'currency', currency: 'USD' }) },
      { label: 'Minimum payment required', value: debt.minimumPaymentDisplay },
      { label: 'Monthly APR', value: `${debt.monthlyRatePercent}%` },
      { label: 'Total paid', value: debt.totalPaidDisplay },
      { label: 'Total interest', value: debt.totalInterestDisplay }
    ];
  }, [result]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12">
        <header className="space-y-2 text-center">
          <p className="text-sm uppercase tracking-wide text-brand-300">Compound Interest Calculator</p>
          <h1 className="text-3xl font-bold sm:text-4xl">Plan your growth with confidence</h1>
        </header>

        <main className="grid gap-6 lg:grid-cols-[3fr,2fr]">
          <section className="rounded-2xl bg-slate-900/70 p-6 shadow-xl shadow-slate-900/40">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Calculation inputs</h2>
                <p className="text-sm text-slate-400">All numbers stay local until you submit.</p>
              </div>
              <button
                type="button"
                className="text-sm font-medium text-brand-300 hover:text-brand-200"
                onClick={() => {
                  setGrowthForm({ ...initialGrowthForm });
                  setDebtForm({ ...initialDebtForm });
                  setResult(null);
                  setError(null);
                  setMode('contribution');
                }}
              >
                Reset
              </button>
            </div>

            <div>
              <span className="text-sm font-medium text-slate-200">Calculator type</span>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {[
                  {
                    key: 'contribution' as const,
                    title: 'Contribution growth',
                    helper: 'Monthly deposits + compounding'
                  },
                  {
                    key: 'savings' as const,
                    title: 'Savings growth',
                    helper: 'Fixed balance (HYSA/CD style)'
                  },
                  {
                    key: 'debt' as const,
                    title: 'Debt payoff',
                    helper: 'Months until balance reaches zero'
                  }
                ].map(option => {
                  const active = mode === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      className={`rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
                        active
                          ? 'border-brand-400 bg-brand-500/10 text-brand-100'
                          : 'border-slate-800/80 bg-slate-950/40 text-slate-300 hover:border-brand-700/40'
                      }`}
                      onClick={() => {
                        setMode(option.key);
                        setResult(null);
                        setError(null);
                        if (option.key === 'savings') {
                          setGrowthForm(prev => ({ ...prev, monthlyContribution: '0' }));
                        }
                      }}
                    >
                      <p className="text-sm font-semibold">{option.title}</p>
                      <p className="text-xs text-slate-400">{option.helper}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {isDebtMode ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-slate-200">Total debt ($)</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={1}
                      onKeyDown={preventInvalidNumericInput}
                      className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-base text-white focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                      value={debtForm.totalDebt}
                      onChange={event => handleDebtChange('totalDebt', event.target.value)}
                      required
                    />
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-slate-200">Monthly payment ($)</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={1}
                      onKeyDown={preventInvalidNumericInput}
                      className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-base text-white focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                      value={debtForm.monthlyPayment}
                      onChange={event => handleDebtChange('monthlyPayment', event.target.value)}
                      required
                    />
                    {minimumPaymentHint && (
                      <span className="text-xs text-slate-400">
                        Minimum payment to reduce balance: <span className="font-semibold text-slate-200">{minimumPaymentHint}</span>
                      </span>
                    )}
                  </label>

                  <label className="flex flex-col gap-2 sm:col-span-2">
                    <span className="text-sm font-medium text-slate-200">Monthly APR (%)</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={100}
                      step={0.01}
                      onKeyDown={preventInvalidNumericInput}
                      className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-base text-white focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                      value={debtForm.monthlyRatePercent}
                      onChange={event => handleDebtChange('monthlyRatePercent', event.target.value)}
                      required
                    />
                  </label>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-slate-200">Principal ($)</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1}
                        onKeyDown={preventInvalidNumericInput}
                        className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-base text-white focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                        value={growthForm.principal}
                        onChange={event => handleGrowthChange('principal', event.target.value)}
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
                        value={growthForm.annualRatePercent}
                        onChange={event => handleGrowthChange('annualRatePercent', event.target.value)}
                        required
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
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
                        value={growthForm.durationYears}
                        onChange={event => handleGrowthChange('durationYears', event.target.value)}
                        required
                      />
                    </label>

                    {!isSavingsMode && (
                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-slate-200">Monthly Contribution ($)</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1}
                          onKeyDown={preventInvalidNumericInput}
                          className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-base text-white focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                          value={growthForm.monthlyContribution}
                          onChange={event => handleGrowthChange('monthlyContribution', event.target.value)}
                          required
                        />
                      </label>
                    )}
                  </div>
                </>
              )}

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-200">Client reference (optional)</span>
                <input
                  type="text"
                  maxLength={64}
                  className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-base text-white focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                  value={activeClientReference}
                  onChange={event =>
                    isDebtMode
                      ? handleDebtChange('clientReference', event.target.value)
                      : handleGrowthChange('clientReference', event.target.value)
                  }
                />
              </label>

              {!isDebtMode && (
                <div>
                  <span className="text-sm font-medium text-slate-200">Compounding cadence</span>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {cadenceOptions.map(option => {
                      const active = growthForm.compoundingCadence === option.value;
                      return (
                        <button
                          type="button"
                          key={option.value}
                          className={`rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
                            active
                              ? 'border-brand-400 bg-brand-500/10 text-brand-100'
                              : 'border-slate-800/80 bg-slate-950/40 text-slate-300 hover:border-brand-700/40'
                          }`}
                          onClick={() =>
                            setGrowthForm(prev => ({
                              ...prev,
                              compoundingCadence: option.value
                            }))
                          }
                        >
                          <p className="text-sm font-semibold">{option.label}</p>
                          <p className="text-xs text-slate-400">{option.helper}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-2xl bg-brand-500 px-6 py-3 text-base font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-500/50"
                >
                  {isSubmitting ? 'Calculating…' : submitLabel}
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
          </section>

          <section className="flex flex-col gap-5 rounded-2xl bg-slate-900/60 p-6 shadow-inner shadow-black/20">
            <div>
              <p className="text-sm uppercase tracking-wide text-brand-300">Results</p>
              <h2 className="text-2xl font-semibold text-white">Projection</h2>
            </div>

            {result ? (
              <div className="space-y-5">
                {result.kind === 'growth' ? (
                  <div className="rounded-2xl border border-brand-500/40 bg-brand-500/10 p-5">
                    <p className="text-sm uppercase tracking-wide text-brand-200">Ending balance</p>
                    <p className="text-4xl font-bold text-white">{result.data.currencyDisplay}</p>
                    <p className="text-xs text-slate-300">Calculated at {new Date(result.data.calculatedAt).toLocaleString()}</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-brand-500/40 bg-brand-500/10 p-5">
                    <p className="text-sm uppercase tracking-wide text-brand-200">Months to payoff</p>
                    <p className="text-4xl font-bold text-white">{result.data.monthsToPayoff}</p>
                    <p className="text-xs text-slate-300">
                      Calculated at {new Date(result.data.calculatedAt).toLocaleString()} · Total paid {result.data.totalPaidDisplay}
                    </p>
                    <p className="text-xs text-slate-400">Interest accrued {result.data.totalInterestDisplay}</p>
                    <p className="text-xs text-slate-400">Minimum payment required {result.data.minimumPaymentDisplay}</p>
                  </div>
                )}

                <dl className="grid gap-4 text-sm text-slate-200">
                  {summary?.map(item => (
                    <div key={item.label} className="rounded-xl border border-slate-800/60 bg-slate-950/30 px-4 py-3">
                      <dt className="text-xs uppercase tracking-wide text-slate-400">{item.label}</dt>
                      <dd className="text-base font-semibold">{item.value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="rounded-xl border border-slate-800/60 bg-slate-950/50 px-4 py-3 text-xs text-slate-400">
                  <p className="font-semibold text-slate-300">Trace info</p>
                  <p>Response ID: <span className="font-mono text-slate-200">{result.data.responseId}</span></p>
                  <p>Trace ID: <span className="font-mono text-slate-200">{result.data.traceId}</span></p>
                  {result.data.clientReference && (
                    <p>Client reference: <span className="font-medium text-slate-100">{result.data.clientReference}</span></p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800/60 bg-slate-950/30 p-8 text-center text-slate-400">
                <p className="text-base font-medium text-slate-200">No calculation yet</p>
                <p className="text-sm">Fill out the form and click &ldquo;{submitLabel}&rdquo; to see the projection.</p>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
