import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { addDebt, addDebtPayment, DebtPayment, DebtRecord, getDebtPayments, getDebts } from './debtLog';

type DebtFormState = {
  name: string;
  currentBalance: string;
  annualAprPercent: string;
  minimumPayment: string;
};

type PaymentFormState = {
  amount: string;
  date: string;
  note: string;
};

type ValidationProblemDetails = {
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
};

type DebtProjectionResponse = {
  monthsToPayoff: number;
  totalPaidDisplay: string;
  totalInterestDisplay: string;
  minimumPaymentDisplay: string;
};

type DebtProjectionView = {
  monthsToPayoff: number;
  totalPaidDisplay: string;
  totalInterestDisplay: string;
  minimumPaymentDisplay: string;
  paymentUsedDisplay: string;
  isUnavailable: boolean;
  isCustomPayment: boolean;
  errorMessage?: string;
};

const initialDebtForm: DebtFormState = {
  name: '',
  currentBalance: '',
  annualAprPercent: '',
  minimumPayment: ''
};

const todayString = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

const preventInvalidNumericInput = (event: KeyboardEvent<HTMLInputElement>) => {
  if (['e', 'E', '+', '-'].includes(event.key)) {
    event.preventDefault();
  }
};

const formatCurrency = (cents: number): string => (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' });

const parseCurrencyInputToCents = (value: string): number | null => {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed * 100);
};

const parseAprInput = (value: string): number | null => {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1200) {
    return null;
  }

  return parsed;
};

const getDebtMetrics = (
  debt: DebtRecord,
  payments: DebtPayment[]
): { totalPaidCents: number; remainingBalanceCents: number; progressPercent: number } => {
  const totalPaidCents = payments.reduce((sum, payment) => sum + payment.amountCents, 0);
  const remainingBalanceCents = Math.max(debt.startingBalanceCents - totalPaidCents, 0);
  const progressPercent = debt.startingBalanceCents > 0 ? Math.min((totalPaidCents / debt.startingBalanceCents) * 100, 100) : 0;

  return { totalPaidCents, remainingBalanceCents, progressPercent };
};

const groupPaymentsByDebt = (payments: DebtPayment[]): Record<string, DebtPayment[]> =>
  payments.reduce<Record<string, DebtPayment[]>>((acc, payment) => {
    if (!acc[payment.debtId]) {
      acc[payment.debtId] = [];
    }

    acc[payment.debtId].push(payment);
    return acc;
  }, {});

const getProblemMessage = (problem: ValidationProblemDetails | null): string => {
  if (!problem) {
    return 'Projection unavailable right now.';
  }

  if (problem.errors) {
    const messages = Object.values(problem.errors).flat();
    if (messages.length > 0) {
      return messages.join(' ');
    }
  }

  return problem.detail ?? problem.title ?? 'Projection unavailable right now.';
};

const toErrorMessage = (error: unknown, fallback: string): string => (error instanceof Error ? error.message : fallback);

export default function DebtLogPage() {
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [paymentsByDebt, setPaymentsByDebt] = useState<Record<string, DebtPayment[]>>({});
  const [projectionByDebt, setProjectionByDebt] = useState<Record<string, DebtProjectionView>>({});
  const [projectionLoadingByDebt, setProjectionLoadingByDebt] = useState<Record<string, boolean>>({});
  const [customPaymentInputs, setCustomPaymentInputs] = useState<Record<string, string>>({});
  const [paymentForms, setPaymentForms] = useState<Record<string, PaymentFormState>>({});
  const [paymentErrors, setPaymentErrors] = useState<Record<string, string | null>>({});
  const [projectionErrors, setProjectionErrors] = useState<Record<string, string | null>>({});
  const [debtForm, setDebtForm] = useState<DebtFormState>(initialDebtForm);
  const [debtFormError, setDebtFormError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingDebt, setIsAddingDebt] = useState(false);
  const [savingPaymentByDebt, setSavingPaymentByDebt] = useState<Record<string, boolean>>({});

  const fetchProjection = useCallback(
    async (
      debt: DebtRecord,
      remainingBalanceCents: number,
      monthlyPaymentCents: number,
      isCustomPayment: boolean
    ): Promise<DebtProjectionView> => {
      if (remainingBalanceCents <= 0) {
        return {
          monthsToPayoff: 0,
          totalPaidDisplay: formatCurrency(0),
          totalInterestDisplay: formatCurrency(0),
          minimumPaymentDisplay: formatCurrency(debt.minimumPaymentCents),
          paymentUsedDisplay: formatCurrency(monthlyPaymentCents),
          isUnavailable: false,
          isCustomPayment
        };
      }

      if (monthlyPaymentCents <= 0) {
        return {
          monthsToPayoff: 0,
          totalPaidDisplay: '',
          totalInterestDisplay: '',
          minimumPaymentDisplay: formatCurrency(debt.minimumPaymentCents),
          paymentUsedDisplay: formatCurrency(monthlyPaymentCents),
          isUnavailable: true,
          isCustomPayment,
          errorMessage: 'Monthly payment must be greater than zero.'
        };
      }

      try {
        const response = await fetch('/api/v1/debt/payoff', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            totalDebt: Number((remainingBalanceCents / 100).toFixed(2)),
            monthlyPayment: Number((monthlyPaymentCents / 100).toFixed(2)),
            monthlyRatePercent: Number((debt.annualAprPercent / 12).toFixed(6)),
            requestedAt: new Date().toISOString(),
            clientReference: `debt-log-${debt.id}`
          })
        });

        if (!response.ok) {
          const problem = (await response.json().catch(() => null)) as ValidationProblemDetails | null;
          throw new Error(getProblemMessage(problem));
        }

        const body = (await response.json()) as DebtProjectionResponse;
        return {
          monthsToPayoff: body.monthsToPayoff,
          totalPaidDisplay: body.totalPaidDisplay,
          totalInterestDisplay: body.totalInterestDisplay,
          minimumPaymentDisplay: body.minimumPaymentDisplay,
          paymentUsedDisplay: formatCurrency(monthlyPaymentCents),
          isUnavailable: false,
          isCustomPayment
        };
      } catch (projectionError) {
        return {
          monthsToPayoff: 0,
          totalPaidDisplay: '',
          totalInterestDisplay: '',
          minimumPaymentDisplay: formatCurrency(debt.minimumPaymentCents),
          paymentUsedDisplay: formatCurrency(monthlyPaymentCents),
          isUnavailable: true,
          isCustomPayment,
          errorMessage: toErrorMessage(projectionError, 'Projection unavailable right now.')
        };
      }
    },
    []
  );

  const refreshDefaultProjections = useCallback(
    async (nextDebts: DebtRecord[], nextPaymentsByDebt: Record<string, DebtPayment[]>) => {
      if (nextDebts.length === 0) {
        setProjectionByDebt({});
        setProjectionLoadingByDebt({});
        return;
      }

      setProjectionLoadingByDebt(
        nextDebts.reduce<Record<string, boolean>>((acc, debt) => {
          acc[debt.id] = true;
          return acc;
        }, {})
      );

      const projectionEntries = await Promise.all(
        nextDebts.map(async debt => {
          const metrics = getDebtMetrics(debt, nextPaymentsByDebt[debt.id] ?? []);
          const projection = await fetchProjection(debt, metrics.remainingBalanceCents, debt.minimumPaymentCents, false);
          return [debt.id, projection] as const;
        })
      );

      setProjectionByDebt(Object.fromEntries(projectionEntries));
      setProjectionLoadingByDebt({});
    },
    [fetchProjection]
  );

  const refreshFromStorage = useCallback(
    async (showInitialLoading = false) => {
      if (showInitialLoading) {
        setIsLoading(true);
      }

      try {
        const [nextDebts, nextPayments] = await Promise.all([getDebts(), getDebtPayments()]);
        const nextPaymentsByDebt = groupPaymentsByDebt(nextPayments);

        setDebts(nextDebts);
        setPaymentsByDebt(nextPaymentsByDebt);
        setPaymentForms(prev => {
          return nextDebts.reduce<Record<string, PaymentFormState>>((acc, debt) => {
            acc[debt.id] = prev[debt.id] ?? {
              amount: '',
              date: todayString(),
              note: ''
            };
            return acc;
          }, {});
        });
        setCustomPaymentInputs(prev => {
          return nextDebts.reduce<Record<string, string>>((acc, debt) => {
            acc[debt.id] = prev[debt.id] ?? '';
            return acc;
          }, {});
        });
        await refreshDefaultProjections(nextDebts, nextPaymentsByDebt);
        setError(null);
      } catch (storageError) {
        setError(toErrorMessage(storageError, 'Unable to load local debt log data.'));
      } finally {
        if (showInitialLoading) {
          setIsLoading(false);
        }
      }
    },
    [refreshDefaultProjections]
  );

  useEffect(() => {
    refreshFromStorage(true).catch(() => {
      setError('Unable to load local debt log data.');
      setIsLoading(false);
    });
  }, [refreshFromStorage]);

  const overall = useMemo(() => {
    return debts.reduce(
      (acc, debt) => {
        const metrics = getDebtMetrics(debt, paymentsByDebt[debt.id] ?? []);
        acc.starting += debt.startingBalanceCents;
        acc.paid += metrics.totalPaidCents;
        acc.remaining += metrics.remainingBalanceCents;
        return acc;
      },
      { starting: 0, paid: 0, remaining: 0 }
    );
  }, [debts, paymentsByDebt]);

  const handleDebtFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDebtFormError(null);

    const currentBalanceCents = parseCurrencyInputToCents(debtForm.currentBalance);
    const minimumPaymentCents = parseCurrencyInputToCents(debtForm.minimumPayment);
    const annualAprPercent = parseAprInput(debtForm.annualAprPercent);
    const trimmedName = debtForm.name.trim();

    if (!trimmedName) {
      setDebtFormError('Debt name is required.');
      return;
    }

    if (currentBalanceCents === null) {
      setDebtFormError('Current balance must be greater than zero.');
      return;
    }

    if (annualAprPercent === null) {
      setDebtFormError('Annual APR must be a number between 0 and 1200.');
      return;
    }

    if (minimumPaymentCents === null) {
      setDebtFormError('Minimum payment must be greater than zero.');
      return;
    }

    setIsAddingDebt(true);
    try {
      await addDebt({
        name: trimmedName,
        startingBalanceCents: currentBalanceCents,
        annualAprPercent,
        minimumPaymentCents
      });

      setDebtForm(initialDebtForm);
      await refreshFromStorage();
    } catch (submitError) {
      setDebtFormError(toErrorMessage(submitError, 'Unable to add debt right now.'));
    } finally {
      setIsAddingDebt(false);
    }
  };

  const handlePaymentFormChange = (debtId: string, field: keyof PaymentFormState, value: string) => {
    setPaymentForms(prev => ({
      ...prev,
      [debtId]: {
        ...(prev[debtId] ?? { amount: '', date: todayString(), note: '' }),
        [field]: value
      }
    }));
  };

  const handlePaymentSubmit = async (event: FormEvent<HTMLFormElement>, debt: DebtRecord) => {
    event.preventDefault();
    const paymentForm = paymentForms[debt.id] ?? { amount: '', date: todayString(), note: '' };
    const amountCents = parseCurrencyInputToCents(paymentForm.amount);

    if (amountCents === null) {
      setPaymentErrors(prev => ({ ...prev, [debt.id]: 'Payment amount must be greater than zero.' }));
      return;
    }

    if (!paymentForm.date.trim()) {
      setPaymentErrors(prev => ({ ...prev, [debt.id]: 'Payment date is required.' }));
      return;
    }

    setPaymentErrors(prev => ({ ...prev, [debt.id]: null }));
    setSavingPaymentByDebt(prev => ({ ...prev, [debt.id]: true }));

    try {
      await addDebtPayment({
        debtId: debt.id,
        amountCents,
        date: paymentForm.date,
        note: paymentForm.note
      });

      setPaymentForms(prev => ({
        ...prev,
        [debt.id]: {
          amount: '',
          date: todayString(),
          note: ''
        }
      }));
      await refreshFromStorage();
    } catch (submitError) {
      setPaymentErrors(prev => ({ ...prev, [debt.id]: toErrorMessage(submitError, 'Unable to save payment right now.') }));
    } finally {
      setSavingPaymentByDebt(prev => ({ ...prev, [debt.id]: false }));
    }
  };

  const runProjectionForDebt = async (debt: DebtRecord, monthlyPaymentCents: number, isCustomPayment: boolean) => {
    const metrics = getDebtMetrics(debt, paymentsByDebt[debt.id] ?? []);
    setProjectionLoadingByDebt(prev => ({ ...prev, [debt.id]: true }));

    try {
      const projection = await fetchProjection(debt, metrics.remainingBalanceCents, monthlyPaymentCents, isCustomPayment);
      setProjectionByDebt(prev => ({ ...prev, [debt.id]: projection }));
    } finally {
      setProjectionLoadingByDebt(prev => ({ ...prev, [debt.id]: false }));
    }
  };

  const handleProjectionSubmit = async (event: FormEvent<HTMLFormElement>, debt: DebtRecord) => {
    event.preventDefault();
    const input = customPaymentInputs[debt.id]?.trim() ?? '';

    if (!input) {
      setProjectionErrors(prev => ({ ...prev, [debt.id]: null }));
      await runProjectionForDebt(debt, debt.minimumPaymentCents, false);
      return;
    }

    const customPaymentCents = parseCurrencyInputToCents(input);
    if (customPaymentCents === null) {
      setProjectionErrors(prev => ({ ...prev, [debt.id]: 'Custom payment must be greater than zero.' }));
      return;
    }

    setProjectionErrors(prev => ({ ...prev, [debt.id]: null }));
    await runProjectionForDebt(debt, customPaymentCents, true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-wide text-brand-300">Debt Log</p>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">Track debt balances and payoff progress</h1>
          <p className="text-sm text-slate-300">Debt records and payment history are stored in this browser.</p>
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Starting debt</p>
            <p className="mt-2 text-xl font-semibold text-white">{formatCurrency(overall.starting)}</p>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Paid since tracking</p>
            <p className="mt-2 text-xl font-semibold text-brand-200">{formatCurrency(overall.paid)}</p>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Remaining balance</p>
            <p className="mt-2 text-xl font-semibold text-white">{formatCurrency(overall.remaining)}</p>
          </article>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-slate-900/30">
          <h2 className="text-xl font-semibold text-white">Add debt</h2>
          <p className="mt-1 text-sm text-slate-300">Use annual APR. Projection defaults to minimum payment unless custom payment is entered.</p>
          <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={handleDebtFormSubmit}>
            <label className="flex flex-col gap-2 sm:col-span-2">
              <span className="text-sm text-slate-200">Debt name</span>
              <input
                type="text"
                value={debtForm.name}
                onChange={event => setDebtForm(prev => ({ ...prev, name: event.target.value }))}
                className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-slate-100 outline-none transition focus:border-brand-400"
                placeholder="Credit card, auto loan, student loan"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm text-slate-200">Current balance ($)</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                onKeyDown={preventInvalidNumericInput}
                value={debtForm.currentBalance}
                onChange={event => setDebtForm(prev => ({ ...prev, currentBalance: event.target.value }))}
                className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-slate-100 outline-none transition focus:border-brand-400"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm text-slate-200">Annual APR (%)</span>
              <input
                type="number"
                min="0"
                max="1200"
                step="0.01"
                onKeyDown={preventInvalidNumericInput}
                value={debtForm.annualAprPercent}
                onChange={event => setDebtForm(prev => ({ ...prev, annualAprPercent: event.target.value }))}
                className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-slate-100 outline-none transition focus:border-brand-400"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm text-slate-200">Minimum payment ($)</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                onKeyDown={preventInvalidNumericInput}
                value={debtForm.minimumPayment}
                onChange={event => setDebtForm(prev => ({ ...prev, minimumPayment: event.target.value }))}
                className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-slate-100 outline-none transition focus:border-brand-400"
              />
            </label>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={isAddingDebt}
                className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAddingDebt ? 'Adding debt...' : 'Add debt'}
              </button>
            </div>
          </form>
          {debtFormError ? <p className="mt-3 text-sm text-rose-300">{debtFormError}</p> : null}
        </section>

        {error ? (
          <section className="rounded-xl border border-rose-900/70 bg-rose-950/50 p-4">
            <p className="text-sm text-rose-200">{error}</p>
          </section>
        ) : null}

        {isLoading ? <p className="text-sm text-slate-300">Loading debt log...</p> : null}

        {!isLoading && debts.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/30 p-6 text-sm text-slate-300">
            No debts yet. Add your first debt above to start tracking payoff progress.
          </section>
        ) : null}

        <section className="grid gap-5">
          {debts.map(debt => {
            const payments = paymentsByDebt[debt.id] ?? [];
            const paymentForm = paymentForms[debt.id] ?? { amount: '', date: todayString(), note: '' };
            const projection = projectionByDebt[debt.id];
            const metrics = getDebtMetrics(debt, payments);
            const isSavingPayment = savingPaymentByDebt[debt.id] ?? false;
            const isProjectionLoading = projectionLoadingByDebt[debt.id] ?? false;

            return (
              <article key={debt.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-slate-900/20">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h3 className="text-xl font-semibold text-white">{debt.name}</h3>
                    <p className="mt-1 text-sm text-slate-300">
                      APR {debt.annualAprPercent.toFixed(2)}% • Minimum payment {formatCurrency(debt.minimumPaymentCents)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Current balance</p>
                    <p className="mt-2 text-lg font-semibold text-white">{formatCurrency(metrics.remainingBalanceCents)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Paid since tracking</p>
                    <p className="mt-2 text-lg font-semibold text-brand-200">{formatCurrency(metrics.totalPaidCents)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Progress</p>
                    <p className="mt-2 text-lg font-semibold text-white">{metrics.progressPercent.toFixed(1)}%</p>
                  </div>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-brand-400 transition-all" style={{ width: `${metrics.progressPercent}%` }} />
                </div>

                <section className="mt-6 grid gap-4 lg:grid-cols-[3fr,2fr]">
                  <form className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4" onSubmit={event => handlePaymentSubmit(event, debt)}>
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-200">Add payment entry</h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="flex flex-col gap-2">
                        <span className="text-sm text-slate-300">Amount ($)</span>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          onKeyDown={preventInvalidNumericInput}
                          value={paymentForm.amount}
                          onChange={event => handlePaymentFormChange(debt.id, 'amount', event.target.value)}
                          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none transition focus:border-brand-400"
                        />
                      </label>
                      <label className="flex flex-col gap-2">
                        <span className="text-sm text-slate-300">Date</span>
                        <input
                          type="date"
                          value={paymentForm.date}
                          onChange={event => handlePaymentFormChange(debt.id, 'date', event.target.value)}
                          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none transition focus:border-brand-400"
                        />
                      </label>
                    </div>
                    <label className="flex flex-col gap-2">
                      <span className="text-sm text-slate-300">Note (optional)</span>
                      <input
                        type="text"
                        value={paymentForm.note}
                        onChange={event => handlePaymentFormChange(debt.id, 'note', event.target.value)}
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none transition focus:border-brand-400"
                        placeholder="Extra payment, statement close, etc."
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={isSavingPayment}
                      className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSavingPayment ? 'Saving...' : 'Record payment'}
                    </button>
                    {paymentErrors[debt.id] ? <p className="text-sm text-rose-300">{paymentErrors[debt.id]}</p> : null}
                  </form>

                  <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-200">Payoff projection</h4>
                    <form className="space-y-2" onSubmit={event => handleProjectionSubmit(event, debt)}>
                      <label className="flex flex-col gap-2">
                        <span className="text-sm text-slate-300">Custom monthly payment ($, optional)</span>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          onKeyDown={preventInvalidNumericInput}
                          value={customPaymentInputs[debt.id] ?? ''}
                          onChange={event => setCustomPaymentInputs(prev => ({ ...prev, [debt.id]: event.target.value }))}
                          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none transition focus:border-brand-400"
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={isProjectionLoading}
                        className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isProjectionLoading ? 'Updating projection...' : 'Update projection'}
                      </button>
                      {projectionErrors[debt.id] ? <p className="text-sm text-rose-300">{projectionErrors[debt.id]}</p> : null}
                    </form>

                    {!projection ? <p className="text-sm text-slate-300">Projection will appear once data is loaded.</p> : null}
                    {projection?.isUnavailable ? <p className="text-sm text-rose-300">{projection.errorMessage}</p> : null}
                    {projection && !projection.isUnavailable ? (
                      <div className="space-y-1 text-sm text-slate-200">
                        <p>
                          Payment basis:{' '}
                          <span className="font-medium text-white">
                            {projection.paymentUsedDisplay}
                            {projection.isCustomPayment ? ' (custom)' : ' (minimum payment)'}
                          </span>
                        </p>
                        <p>
                          Months to payoff: <span className="font-medium text-white">{projection.monthsToPayoff.toLocaleString()}</span>
                        </p>
                        <p>
                          Estimated total paid: <span className="font-medium text-white">{projection.totalPaidDisplay}</span>
                        </p>
                        <p>
                          Estimated total interest: <span className="font-medium text-white">{projection.totalInterestDisplay}</span>
                        </p>
                      </div>
                    ) : null}
                  </div>
                </section>

                <section className="mt-5 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-200">Payment history</h4>
                  {payments.length === 0 ? <p className="mt-2 text-sm text-slate-300">No payments logged yet.</p> : null}
                  {payments.length > 0 ? (
                    <ul className="mt-3 space-y-2">
                      {payments.slice(0, 12).map(payment => (
                        <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 px-3 py-2 text-sm">
                          <div className="text-slate-200">
                            <span className="font-medium text-white">{formatCurrency(payment.amountCents)}</span>
                            <span className="ml-2 text-slate-400">{payment.date}</span>
                          </div>
                          {payment.note ? <span className="text-slate-300">{payment.note}</span> : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}
