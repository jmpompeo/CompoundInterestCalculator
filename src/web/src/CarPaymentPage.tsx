import { FormEvent, KeyboardEvent, useMemo, useState } from 'react';

type CarLoanRequest = {
  vehiclePrice: number;
  cashDownPayment: number;
  tradeInValue: number;
  tradeInPayoff: number;
  annualRatePercent: number;
  termMonths: number;
  salesTaxPercent?: number;
  salesTaxAmount?: number;
  fees: number;
  rebate: number;
  financedExtras: number;
  clientReference?: string;
  requestedAt?: string;
};

type CarLoanAmortizationEntryResponse = {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
};

type CarLoanResponse = {
  vehiclePrice: number;
  cashDownPayment: number;
  tradeInValue: number;
  tradeInPayoff: number;
  netTradeInCredit: number;
  totalUpfrontCredit: number;
  salesTax: number;
  fees: number;
  rebate: number;
  financedExtras: number;
  amountFinanced: number;
  annualRatePercent: number;
  termMonths: number;
  monthlyPayment: number;
  totalPaid: number;
  totalInterest: number;
  amountFinancedDisplay: string;
  monthlyPaymentDisplay: string;
  totalPaidDisplay: string;
  totalInterestDisplay: string;
  totalUpfrontCreditDisplay: string;
  netTradeInCreditDisplay: string;
  calculationVersion: string;
  traceId: string;
  responseId: string;
  clientReference?: string;
  requestedAt?: string;
  calculatedAt: string;
  amortizationSchedule: CarLoanAmortizationEntryResponse[];
};

type ValidationProblemDetails = {
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
};

type CarLoanFormState = {
  vehiclePrice: string;
  cashDownPayment: string;
  tradeInValue: string;
  tradeInPayoff: string;
  annualRatePercent: string;
  termMonths: string;
  salesTaxMode: 'Percent' | 'Amount';
  salesTaxValue: string;
  fees: string;
  rebate: string;
  financedExtras: string;
  clientReference: string;
};

const initialCarLoanForm: CarLoanFormState = {
  vehiclePrice: '35000',
  cashDownPayment: '3000',
  tradeInValue: '8000',
  tradeInPayoff: '5000',
  annualRatePercent: '6.5',
  termMonths: '60',
  salesTaxMode: 'Percent',
  salesTaxValue: '7.5',
  fees: '1200',
  rebate: '1000',
  financedExtras: '500',
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

const formatCurrency = (value: number): string =>
  value.toLocaleString(undefined, { style: 'currency', currency: 'USD' });

const roundToTwo = (value: number): number => Math.round(value * 100) / 100;

export default function CarPaymentPage() {
  const [form, setForm] = useState(initialCarLoanForm);
  const [result, setResult] = useState<CarLoanResponse | null>(null);
  const [status, setStatus] = useState<'idle' | 'submitting'>('idle');
  const [error, setError] = useState<string | null>(null);

  const isSubmitting = status === 'submitting';

  const salesTaxAmountHint = useMemo(() => {
    if (form.salesTaxMode !== 'Percent') {
      return null;
    }

    const vehiclePrice = parseNumber(form.vehiclePrice);
    const salesTaxPercent = parseNumber(form.salesTaxValue);
    if (vehiclePrice === null || salesTaxPercent === null) {
      return null;
    }

    return formatCurrency(roundToTwo((vehiclePrice * salesTaxPercent) / 100));
  }, [form.salesTaxMode, form.vehiclePrice, form.salesTaxValue]);

  const netTradeInCreditHint = useMemo(() => {
    const tradeInValue = parseNumber(form.tradeInValue);
    const tradeInPayoff = parseNumber(form.tradeInPayoff);
    if (tradeInValue === null || tradeInPayoff === null) {
      return null;
    }

    return formatCurrency(roundToTwo(Math.max(tradeInValue - tradeInPayoff, 0)));
  }, [form.tradeInValue, form.tradeInPayoff]);

  const summary = useMemo(() => {
    if (!result) {
      return null;
    }

    return [
      { label: 'Vehicle price', value: formatCurrency(result.vehiclePrice) },
      { label: 'Cash down payment', value: formatCurrency(result.cashDownPayment) },
      { label: 'Trade-in value', value: formatCurrency(result.tradeInValue) },
      { label: 'Trade-in payoff', value: formatCurrency(result.tradeInPayoff) },
      { label: 'Net trade-in credit', value: result.netTradeInCreditDisplay },
      { label: 'Total upfront credit', value: result.totalUpfrontCreditDisplay },
      { label: 'Sales tax', value: formatCurrency(result.salesTax) },
      { label: 'Fees', value: formatCurrency(result.fees) },
      { label: 'Rebate', value: formatCurrency(result.rebate) },
      { label: 'Financed extras', value: formatCurrency(result.financedExtras) },
      { label: 'Amount financed', value: result.amountFinancedDisplay },
      { label: 'APR', value: `${result.annualRatePercent}%` },
      { label: 'Term', value: `${result.termMonths} months` },
      { label: 'Total paid', value: result.totalPaidDisplay },
      { label: 'Total interest', value: result.totalInterestDisplay }
    ];
  }, [result]);

  const handleChange = (name: keyof CarLoanFormState, value: string) => {
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setStatus('submitting');

    const salesTaxValue = Number(form.salesTaxValue);
    const payload: CarLoanRequest = {
      vehiclePrice: Number(form.vehiclePrice),
      cashDownPayment: Number(form.cashDownPayment),
      tradeInValue: Number(form.tradeInValue),
      tradeInPayoff: Number(form.tradeInPayoff),
      annualRatePercent: Number(form.annualRatePercent),
      termMonths: Number(form.termMonths),
      salesTaxPercent: form.salesTaxMode === 'Percent' ? salesTaxValue : undefined,
      salesTaxAmount: form.salesTaxMode === 'Amount' ? salesTaxValue : undefined,
      fees: Number(form.fees),
      rebate: Number(form.rebate),
      financedExtras: Number(form.financedExtras),
      clientReference: form.clientReference.trim() || undefined,
      requestedAt: new Date().toISOString()
    };

    try {
      const response = await fetch('/api/v1/car-loan/estimate', {
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

        throw new Error(problem.detail ?? problem.title ?? 'Unable to calculate car payment.');
      }

      const body = (await response.json()) as CarLoanResponse;
      setResult(body);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error occurred.';
      setError(message);
      setResult(null);
    } finally {
      setStatus('idle');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12">
        <header className="space-y-2 text-center">
          <p className="text-sm uppercase tracking-wide text-brand-300">Car Payment Calculator</p>
          <h1 className="text-3xl font-bold sm:text-4xl">Estimate your auto loan with full purchase details</h1>
        </header>

        <main className="grid gap-6 lg:grid-cols-[3fr,2fr]">
          <section className="rounded-2xl bg-slate-900/70 p-6 shadow-xl shadow-slate-900/40">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Loan inputs</h2>
                <p className="text-sm text-slate-400">Includes taxes, fees, rebates, and trade-in handling.</p>
              </div>
              <button
                type="button"
                className="text-sm font-medium text-brand-300 hover:text-brand-200"
                onClick={() => {
                  setForm({ ...initialCarLoanForm });
                  setResult(null);
                  setError(null);
                }}
              >
                Reset
              </button>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-200">Vehicle price ($)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0.01}
                    step={1}
                    onKeyDown={preventInvalidNumericInput}
                    className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-base text-white focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                    value={form.vehiclePrice}
                    onChange={event => handleChange('vehiclePrice', event.target.value)}
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
                  <span className="text-sm font-medium text-slate-200">Term (months)</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={96}
                    step={1}
                    onKeyDown={preventInvalidNumericInput}
                    className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-base text-white focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                    value={form.termMonths}
                    onChange={event => handleChange('termMonths', event.target.value)}
                    required
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-200">Cash down payment ($)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={1}
                    onKeyDown={preventInvalidNumericInput}
                    className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-base text-white focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                    value={form.cashDownPayment}
                    onChange={event => handleChange('cashDownPayment', event.target.value)}
                    required
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-200">Trade-in value ($)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={1}
                    onKeyDown={preventInvalidNumericInput}
                    className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-base text-white focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                    value={form.tradeInValue}
                    onChange={event => handleChange('tradeInValue', event.target.value)}
                    required
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-200">Trade-in payoff ($)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={1}
                    onKeyDown={preventInvalidNumericInput}
                    className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-base text-white focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                    value={form.tradeInPayoff}
                    onChange={event => handleChange('tradeInPayoff', event.target.value)}
                    required
                  />
                  {netTradeInCreditHint && (
                    <span className="text-xs text-slate-400">
                      Net trade-in credit: <span className="font-semibold text-slate-200">{netTradeInCreditHint}</span>
                    </span>
                  )}
                </label>

                <div className="flex flex-col gap-2 sm:col-span-2">
                  <span className="text-sm font-medium text-slate-200">Sales tax input</span>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(['Percent', 'Amount'] as const).map(option => {
                      const active = form.salesTaxMode === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          className={`rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
                            active
                              ? 'border-brand-400 bg-brand-500/10 text-brand-100'
                              : 'border-slate-800/80 bg-slate-950/40 text-slate-300 hover:border-brand-700/40'
                          }`}
                          onClick={() => handleChange('salesTaxMode', option)}
                        >
                          <p className="text-sm font-semibold">{option === 'Percent' ? 'Sales tax %' : 'Sales tax amount ($)'}</p>
                          <p className="text-xs text-slate-400">
                            {option === 'Percent' ? 'Percent of vehicle price' : 'Fixed sales tax amount'}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="flex flex-col gap-2 sm:col-span-2">
                  <span className="text-sm font-medium text-slate-200">
                    Sales tax {form.salesTaxMode === 'Percent' ? '(%)' : '($)'}
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={form.salesTaxMode === 'Percent' ? 0.01 : 1}
                    onKeyDown={preventInvalidNumericInput}
                    className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-base text-white focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                    value={form.salesTaxValue}
                    onChange={event => handleChange('salesTaxValue', event.target.value)}
                    required
                  />
                  {salesTaxAmountHint && (
                    <span className="text-xs text-slate-400">
                      Estimated tax amount: <span className="font-semibold text-slate-200">{salesTaxAmountHint}</span>
                    </span>
                  )}
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-200">Fees ($)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={1}
                    onKeyDown={preventInvalidNumericInput}
                    className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-base text-white focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                    value={form.fees}
                    onChange={event => handleChange('fees', event.target.value)}
                    required
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-200">Rebate ($)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={1}
                    onKeyDown={preventInvalidNumericInput}
                    className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-base text-white focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                    value={form.rebate}
                    onChange={event => handleChange('rebate', event.target.value)}
                    required
                  />
                </label>

                <label className="flex flex-col gap-2 sm:col-span-2">
                  <span className="text-sm font-medium text-slate-200">Financed add-ons ($)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={1}
                    onKeyDown={preventInvalidNumericInput}
                    className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-base text-white focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                    value={form.financedExtras}
                    onChange={event => handleChange('financedExtras', event.target.value)}
                    required
                  />
                </label>
              </div>

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
                  {isSubmitting ? 'Calculating…' : 'Estimate payment'}
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
              <h2 className="text-2xl font-semibold text-white">Car payment projection</h2>
            </div>

            {result ? (
              <div className="space-y-5">
                <div className="rounded-2xl border border-brand-500/40 bg-brand-500/10 p-5">
                  <p className="text-sm uppercase tracking-wide text-brand-200">Estimated monthly payment</p>
                  <p className="text-4xl font-bold text-white">{result.monthlyPaymentDisplay}</p>
                  <p className="text-xs text-slate-300">
                    Calculated at {new Date(result.calculatedAt).toLocaleString()} · Financed {result.amountFinancedDisplay}
                  </p>
                  <p className="text-xs text-slate-400">Total paid {result.totalPaidDisplay}</p>
                  <p className="text-xs text-slate-400">Total interest {result.totalInterestDisplay}</p>
                </div>

                <dl className="grid gap-4 text-sm text-slate-200">
                  {summary?.map(item => (
                    <div key={item.label} className="rounded-xl border border-slate-800/60 bg-slate-950/30 px-4 py-3">
                      <dt className="text-xs uppercase tracking-wide text-slate-400">{item.label}</dt>
                      <dd className="text-base font-semibold">{item.value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="rounded-xl border border-slate-800/60 bg-slate-950/50 px-4 py-3 text-xs text-slate-300">
                  <p className="mb-2 font-semibold text-slate-200">Amortization preview (first 12 months)</p>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-left">
                      <thead className="text-[11px] uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="py-1 pr-3">Month</th>
                          <th className="py-1 pr-3">Payment</th>
                          <th className="py-1 pr-3">Principal</th>
                          <th className="py-1 pr-3">Interest</th>
                          <th className="py-1">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.amortizationSchedule.slice(0, 12).map(entry => (
                          <tr key={entry.month} className="border-t border-slate-800/60">
                            <td className="py-1 pr-3">{entry.month}</td>
                            <td className="py-1 pr-3">{formatCurrency(entry.payment)}</td>
                            <td className="py-1 pr-3">{formatCurrency(entry.principal)}</td>
                            <td className="py-1 pr-3">{formatCurrency(entry.interest)}</td>
                            <td className="py-1">{formatCurrency(entry.remainingBalance)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800/60 bg-slate-950/50 px-4 py-3 text-xs text-slate-400">
                  <p className="font-semibold text-slate-300">Trace info</p>
                  <p>
                    Response ID: <span className="font-mono text-slate-200">{result.responseId}</span>
                  </p>
                  <p>
                    Trace ID: <span className="font-mono text-slate-200">{result.traceId}</span>
                  </p>
                  {result.clientReference && (
                    <p>
                      Client reference: <span className="font-medium text-slate-100">{result.clientReference}</span>
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800/60 bg-slate-950/30 p-8 text-center text-slate-400">
                <p className="text-base font-medium text-slate-200">No estimate yet</p>
                <p className="text-sm">Fill out the form and click &ldquo;Estimate payment&rdquo; to see results.</p>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
