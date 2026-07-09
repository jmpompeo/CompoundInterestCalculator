import { FormEvent, useMemo, useState } from 'react';
import CalculatorWorkspace from '../../components/CalculatorWorkspace';
import ResultSummaryGrid from '../../components/ResultSummaryGrid';
import TraceInfoPanel from '../../components/TraceInfoPanel';
import { formatCurrency, parseNumber, preventInvalidNumericInput, roundToTwo } from '../../utils/numberUtils';

type MortgageRequest = {
  homePrice: number;
  downPaymentValue: number;
  downPaymentType: 'Amount' | 'Percent';
  annualRatePercent: number;
  termYears: number;
  propertyTaxType?: 'Amount' | 'Percent';
  propertyTaxValue?: number;
  pmiType?: 'Amount' | 'Percent';
  pmiValue?: number;
  clientReference?: string;
  requestedAt?: string;
};

type MortgageResponse = {
  homePrice: number;
  downPayment: number;
  loanAmount: number;
  annualRatePercent: number;
  termYears: number;
  monthlyPrincipalAndInterest: number;
  monthlyPropertyTax: number;
  monthlyPmi: number;
  monthlyTotalPayment: number;
  totalPaid: number;
  totalInterest: number;
  loanAmountDisplay: string;
  monthlyPrincipalAndInterestDisplay: string;
  monthlyPropertyTaxDisplay: string;
  monthlyPmiDisplay: string;
  monthlyTotalPaymentDisplay: string;
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

type MortgageFormState = {
  homePrice: string;
  downPaymentValue: string;
  downPaymentType: 'Amount' | 'Percent';
  annualRatePercent: string;
  termYears: string;
  includePropertyTax: boolean;
  propertyTaxType: 'Amount' | 'Percent';
  propertyTaxValue: string;
  includePmi: boolean;
  pmiType: 'Amount' | 'Percent';
  pmiValue: string;
  clientReference: string;
};

const initialMortgageForm: MortgageFormState = {
  homePrice: '450000',
  downPaymentValue: '90000',
  downPaymentType: 'Amount',
  annualRatePercent: '6.25',
  termYears: '30',
  includePropertyTax: false,
  propertyTaxType: 'Amount',
  propertyTaxValue: '',
  includePmi: false,
  pmiType: 'Amount',
  pmiValue: '',
  clientReference: ''
};

const convertDownPaymentValue = (
  homePrice: number | null,
  downPaymentValue: number | null,
  nextType: 'Amount' | 'Percent'
): string => {
  if (homePrice === null || homePrice <= 0 || downPaymentValue === null) {
    return '';
  }

  if (nextType === 'Percent') {
    return roundToTwo((downPaymentValue / homePrice) * 100).toString();
  }

  return roundToTwo((homePrice * downPaymentValue) / 100).toString();
};

const convertAnnualValue = (
  baseAmount: number | null,
  value: number | null,
  nextType: 'Amount' | 'Percent'
): string => {
  if (baseAmount === null || baseAmount <= 0 || value === null) {
    return '';
  }

  if (nextType === 'Percent') {
    return roundToTwo((value / baseAmount) * 100).toString();
  }

  return roundToTwo((baseAmount * value) / 100).toString();
};

const calculateLoanAmount = (
  homePriceValue: number | null,
  downPaymentValue: number | null,
  downPaymentType: 'Amount' | 'Percent'
): number | null => {
  if (homePriceValue === null || downPaymentValue === null) {
    return null;
  }

  const downPaymentAmount =
    downPaymentType === 'Percent'
      ? roundToTwo((homePriceValue * downPaymentValue) / 100)
      : downPaymentValue;

  return roundToTwo(homePriceValue - downPaymentAmount);
};

export default function MortgageCalculator() {
  const [form, setForm] = useState(initialMortgageForm);
  const [result, setResult] = useState<MortgageResponse | null>(null);
  const [status, setStatus] = useState<'idle' | 'submitting'>('idle');
  const [error, setError] = useState<string | null>(null);

  const isSubmitting = status === 'submitting';

  const downPaymentAmountHint = useMemo(() => {
    if (form.downPaymentType !== 'Percent') {
      return null;
    }

    const homePriceValue = parseNumber(form.homePrice);
    const percentValue = parseNumber(form.downPaymentValue);
    if (homePriceValue === null || percentValue === null) {
      return null;
    }

    return formatCurrency(roundToTwo((homePriceValue * percentValue) / 100));
  }, [form.downPaymentType, form.homePrice, form.downPaymentValue]);

  const propertyTaxAmountHint = useMemo(() => {
    if (!form.includePropertyTax || form.propertyTaxType !== 'Percent') {
      return null;
    }

    const homePriceValue = parseNumber(form.homePrice);
    const percentValue = parseNumber(form.propertyTaxValue);
    if (homePriceValue === null || percentValue === null) {
      return null;
    }

    return formatCurrency(roundToTwo((homePriceValue * percentValue) / 100));
  }, [form.includePropertyTax, form.propertyTaxType, form.homePrice, form.propertyTaxValue]);

  const pmiAmountHint = useMemo(() => {
    if (!form.includePmi || form.pmiType !== 'Percent') {
      return null;
    }

    const homePriceValue = parseNumber(form.homePrice);
    const downPaymentValue = parseNumber(form.downPaymentValue);
    const loanAmount = calculateLoanAmount(homePriceValue, downPaymentValue, form.downPaymentType);
    if (loanAmount === null || loanAmount <= 0) {
      return null;
    }

    const percentValue = parseNumber(form.pmiValue);
    if (percentValue === null) {
      return null;
    }

    return formatCurrency(roundToTwo((loanAmount * percentValue) / 100));
  }, [form.includePmi, form.pmiType, form.homePrice, form.downPaymentType, form.downPaymentValue, form.pmiValue]);

  const summary = useMemo(() => {
    if (!result) {
      return [];
    }

    return [
      { label: 'Home price', value: formatCurrency(result.homePrice) },
      { label: 'Down payment', value: formatCurrency(result.downPayment) },
      { label: 'Loan amount', value: result.loanAmountDisplay },
      { label: 'Rate', value: `${result.annualRatePercent}%` },
      { label: 'Term', value: `${result.termYears} years` },
      { label: 'Monthly P&I', value: result.monthlyPrincipalAndInterestDisplay },
      { label: 'Monthly taxes', value: result.monthlyPropertyTaxDisplay },
      { label: 'Monthly PMI', value: result.monthlyPmiDisplay },
      { label: 'Total interest', value: result.totalInterestDisplay }
    ];
  }, [result]);

  const handleChange = (name: keyof MortgageFormState, value: string | boolean) => {
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setStatus('submitting');

    const propertyTaxValue = form.includePropertyTax ? parseNumber(form.propertyTaxValue) : null;
    const propertyTaxType = form.includePropertyTax ? form.propertyTaxType : null;
    const pmiValue = form.includePmi ? parseNumber(form.pmiValue) : null;
    const pmiType = form.includePmi ? form.pmiType : null;

    const payload: MortgageRequest = {
      homePrice: Number(form.homePrice),
      downPaymentValue: Number(form.downPaymentValue),
      downPaymentType: form.downPaymentType,
      annualRatePercent: Number(form.annualRatePercent),
      termYears: Number(form.termYears),
      propertyTaxType: propertyTaxType ?? undefined,
      propertyTaxValue: propertyTaxValue ?? undefined,
      pmiType: pmiType ?? undefined,
      pmiValue: pmiValue ?? undefined,
      clientReference: form.clientReference.trim() || undefined,
      requestedAt: new Date().toISOString()
    };

    try {
      const response = await fetch('/api/v1/mortgage/estimate', {
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

        throw new Error(problem.detail ?? problem.title ?? 'Unable to estimate mortgage payment.');
      }

      const body = (await response.json()) as MortgageResponse;
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
      inputTitle="Mortgage inputs"
      inputDescription="Estimate principal, taxes, PMI, and total monthly housing cost."
      onReset={() => {
        setForm({ ...initialMortgageForm });
        setResult(null);
        setError(null);
      }}
      emptyStateTitle="No estimate yet"
      emptyStateDescription="Fill out the form and click “Estimate payment” to see the projection."
      form={
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-200">Home price ($)</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={1}
                onKeyDown={preventInvalidNumericInput}
                className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-base text-white focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                value={form.homePrice}
                onChange={event => handleChange('homePrice', event.target.value)}
                required
              />
            </label>

            <div className="flex flex-col gap-3">
              <span className="text-sm font-medium text-slate-200">Down payment type</span>
              <div className="grid gap-3 sm:grid-cols-2">
                {(['Amount', 'Percent'] as const).map(option => {
                  const active = form.downPaymentType === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      className={`rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
                        active
                          ? 'border-brand-400 bg-brand-500/10 text-brand-100'
                          : 'border-slate-800/80 bg-slate-950/40 text-slate-300 hover:border-brand-700/40'
                      }`}
                      onClick={() => {
                        if (option === form.downPaymentType) {
                          return;
                        }

                        const homePriceValue = parseNumber(form.homePrice);
                        const downPaymentValue = parseNumber(form.downPaymentValue);
                        const nextValue = convertDownPaymentValue(homePriceValue, downPaymentValue, option);
                        setForm(prev => ({
                          ...prev,
                          downPaymentType: option,
                          downPaymentValue: nextValue === '' ? prev.downPaymentValue : nextValue
                        }));
                      }}
                    >
                      <p className="text-sm font-semibold">{option === 'Amount' ? 'Amount ($)' : 'Percent (%)'}</p>
                      <p className="text-xs text-slate-400">
                        {option === 'Amount' ? 'Fixed dollar amount' : 'Percent of the list price'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

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
              <span className="text-sm font-medium text-slate-200">Term (years)</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={40}
                step={1}
                onKeyDown={preventInvalidNumericInput}
                className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-base text-white focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                value={form.termYears}
                onChange={event => handleChange('termYears', event.target.value)}
                required
              />
            </label>

            <label className="flex flex-col gap-2 sm:col-span-2">
              <span className="text-sm font-medium text-slate-200">
                Down payment {form.downPaymentType === 'Percent' ? '(%)' : '($)'}
              </span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={form.downPaymentType === 'Percent' ? 0.01 : 1}
                onKeyDown={preventInvalidNumericInput}
                className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-base text-white focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                value={form.downPaymentValue}
                onChange={event => handleChange('downPaymentValue', event.target.value)}
                required
              />
              {downPaymentAmountHint ? (
                <span className="text-xs text-slate-400">
                  Estimated amount: <span className="font-semibold text-slate-200">{downPaymentAmountHint}</span>
                </span>
              ) : null}
            </label>

            <div className="sm:col-span-2 rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-slate-200">Add-ons (optional)</span>
                <span className="text-xs text-slate-400">Include property taxes or PMI to estimate a total payment.</span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  { key: 'includePropertyTax' as const, title: 'Property taxes' },
                  { key: 'includePmi' as const, title: 'PMI / mortgage insurance' }
                ].map(option => {
                  const active = form[option.key];
                  return (
                    <button
                      key={option.key}
                      type="button"
                      className={`rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
                        active
                          ? 'border-brand-400 bg-brand-500/10 text-brand-100'
                          : 'border-slate-800/80 bg-slate-950/40 text-slate-300 hover:border-brand-700/40'
                      }`}
                      onClick={() => handleChange(option.key, !form[option.key])}
                    >
                      <p className="text-sm font-semibold">{option.title}</p>
                      <p className="text-xs text-slate-400">{active ? 'Included in total' : 'Excluded for now'}</p>
                    </button>
                  );
                })}
              </div>

              {form.includePropertyTax ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-slate-200">Property tax type</span>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(['Amount', 'Percent'] as const).map(option => {
                        const active = form.propertyTaxType === option;
                        return (
                          <button
                            key={option}
                            type="button"
                            className={`rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
                              active
                                ? 'border-brand-400 bg-brand-500/10 text-brand-100'
                                : 'border-slate-800/80 bg-slate-950/40 text-slate-300 hover:border-brand-700/40'
                            }`}
                            onClick={() => {
                              if (option === form.propertyTaxType) {
                                return;
                              }

                              const homePriceValue = parseNumber(form.homePrice);
                              const taxValue = parseNumber(form.propertyTaxValue);
                              const nextValue = convertAnnualValue(homePriceValue, taxValue, option);
                              setForm(prev => ({
                                ...prev,
                                propertyTaxType: option,
                                propertyTaxValue: nextValue === '' ? prev.propertyTaxValue : nextValue
                              }));
                            }}
                          >
                            <p className="text-sm font-semibold">{option === 'Amount' ? 'Annual $' : 'Annual %'}</p>
                            <p className="text-xs text-slate-400">
                              {option === 'Amount' ? 'Total annual taxes' : 'Percent of home price'}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-slate-200">
                      Property taxes {form.propertyTaxType === 'Percent' ? '(%)' : '($/year)'}
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={form.propertyTaxType === 'Percent' ? 0.01 : 50}
                      onKeyDown={preventInvalidNumericInput}
                      className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-base text-white focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                      value={form.propertyTaxValue}
                      onChange={event => handleChange('propertyTaxValue', event.target.value)}
                      required
                    />
                    {propertyTaxAmountHint ? (
                      <span className="text-xs text-slate-400">
                        Estimated annual amount: <span className="font-semibold text-slate-200">{propertyTaxAmountHint}</span>
                      </span>
                    ) : null}
                  </label>
                </div>
              ) : null}

              {form.includePmi ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-slate-200">PMI type</span>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(['Amount', 'Percent'] as const).map(option => {
                        const active = form.pmiType === option;
                        return (
                          <button
                            key={option}
                            type="button"
                            className={`rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
                              active
                                ? 'border-brand-400 bg-brand-500/10 text-brand-100'
                                : 'border-slate-800/80 bg-slate-950/40 text-slate-300 hover:border-brand-700/40'
                            }`}
                            onClick={() => {
                              if (option === form.pmiType) {
                                return;
                              }

                              const homePriceValue = parseNumber(form.homePrice);
                              const downPaymentValue = parseNumber(form.downPaymentValue);
                              const loanAmount = calculateLoanAmount(homePriceValue, downPaymentValue, form.downPaymentType);
                              const pmiValue = parseNumber(form.pmiValue);
                              const nextValue = convertAnnualValue(loanAmount, pmiValue, option);
                              setForm(prev => ({
                                ...prev,
                                pmiType: option,
                                pmiValue: nextValue === '' ? prev.pmiValue : nextValue
                              }));
                            }}
                          >
                            <p className="text-sm font-semibold">{option === 'Amount' ? 'Annual $' : 'Annual %'}</p>
                            <p className="text-xs text-slate-400">
                              {option === 'Amount' ? 'Total annual PMI' : 'Percent of loan amount'}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-slate-200">
                      PMI {form.pmiType === 'Percent' ? '(%)' : '($/year)'}
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={form.pmiType === 'Percent' ? 0.01 : 25}
                      onKeyDown={preventInvalidNumericInput}
                      className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-base text-white focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                      value={form.pmiValue}
                      onChange={event => handleChange('pmiValue', event.target.value)}
                      required
                    />
                    {pmiAmountHint ? (
                      <span className="text-xs text-slate-400">
                        Estimated annual amount: <span className="font-semibold text-slate-200">{pmiAmountHint}</span>
                      </span>
                    ) : null}
                  </label>
                </div>
              ) : null}
            </div>
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

          {error ? (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>
          ) : null}

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
      }
      result={
        result ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-brand-500/40 bg-brand-500/10 p-5">
              <p className="text-sm uppercase tracking-wide text-brand-200">Total monthly payment</p>
              <p className="text-4xl font-bold text-white">{result.monthlyTotalPaymentDisplay}</p>
              <p className="text-xs text-slate-300">
                Calculated at {new Date(result.calculatedAt).toLocaleString()} · Loan {result.loanAmountDisplay}
              </p>
              <p className="text-xs text-slate-400">Principal &amp; interest {result.monthlyPrincipalAndInterestDisplay}</p>
              <p className="text-xs text-slate-400">Property tax {result.monthlyPropertyTaxDisplay}</p>
              <p className="text-xs text-slate-400">PMI {result.monthlyPmiDisplay}</p>
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
