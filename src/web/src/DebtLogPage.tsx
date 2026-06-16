import { ChangeEvent, FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  addDebt,
  addDebtLedgerEntry,
  DebtLedgerEntry,
  DebtLedgerEntryDirection,
  DebtLedgerEntryType,
  DebtLogSnapshot,
  DebtRecord,
  deleteDebt,
  deleteDebtLedgerEntry,
  exportDebtsCsv,
  exportLedgerEntriesCsv,
  getDebtLedgerEntries,
  getDebtLogSnapshot,
  getDebtMetrics,
  getDebts,
  groupLedgerEntriesByDebt,
  importDebtsCsv,
  importLedgerEntriesCsv,
  restoreDebtLogSnapshot,
  updateDebtLedgerEntry
} from './debtLog';

type ActiveView = 'planner' | 'ledger' | 'data';
type StrategyKey = 'snowball' | 'avalanche';
type StrategyBadge = 'lowest' | 'same' | null;

type DebtFormState = {
  name: string;
  openingBalance: string;
  annualAprPercent: string;
  minimumPayment: string;
};

type LedgerEntryFormState = {
  debtId: string;
  type: DebtLedgerEntryType;
  direction: DebtLedgerEntryDirection;
  amount: string;
  date: string;
  note: string;
};

type ValidationProblemDetails = {
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
};

type DebtStrategyResponse = {
  monthlyBudget: number;
  monthlyBudgetDisplay: string;
  totalMinimumPayment: number;
  totalMinimumPaymentDisplay: string;
  recommendedStrategy: string;
  snowball: DebtStrategyPlan;
  avalanche: DebtStrategyPlan;
  calculationVersion: string;
  traceId: string;
};

type DebtStrategyPlan = {
  strategy: string;
  monthsToPayoff: number;
  totalPaid: number;
  totalInterestPaid: number;
  totalPaidDisplay: string;
  totalInterestDisplay: string;
  finalPayoffDateLabel: string;
  payoffOrder: DebtStrategyPayoffOrderItem[];
  timeline: DebtStrategyMonth[];
};

type DebtStrategyPayoffOrderItem = {
  clientDebtId: string;
  name: string;
  payoffMonth: number;
  startingBalance: number;
  annualAprPercent: number;
};

type DebtStrategyMonth = {
  monthNumber: number;
  startingBalance: number;
  interestCharged: number;
  paymentApplied: number;
  endingBalance: number;
  debts: DebtStrategyMonthDebt[];
};

type DebtStrategyMonthDebt = {
  clientDebtId: string;
  name: string;
  startingBalance: number;
  interestCharged: number;
  paymentApplied: number;
  minimumPaymentApplied: number;
  extraPaymentApplied: number;
  endingBalance: number;
  isTargeted: boolean;
  isPaidOffThisMonth: boolean;
};

type StrategyDebtInput = {
  clientDebtId: string;
  name: string;
  currentBalanceCents: number;
  annualAprPercent: number;
  minimumPaymentCents: number;
};

const initialDebtForm: DebtFormState = {
  name: '',
  openingBalance: '',
  annualAprPercent: '',
  minimumPayment: ''
};

const initialLedgerForm: LedgerEntryFormState = {
  debtId: '',
  type: 'payment',
  direction: 'decrease',
  amount: '',
  date: '',
  note: ''
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

const formatDecimalCurrency = (amount: number): string => amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' });

const toCurrencyCents = (amount: number): number => Math.round(amount * 100);

const formatMonthLabel = (months: number): string => {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years === 0) {
    return months === 1 ? '1 month' : `${months} months`;
  }

  if (remainingMonths === 0) {
    return years === 1 ? '1 year' : `${years} years`;
  }

  const yearLabel = years === 1 ? '1 year' : `${years} years`;
  const monthLabel = remainingMonths === 1 ? '1 month' : `${remainingMonths} months`;
  return `${yearLabel}, ${monthLabel}`;
};

const centsToInput = (cents: number): string => (cents / 100).toFixed(2);

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
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    return null;
  }

  return parsed;
};

const getProblemMessage = (problem: ValidationProblemDetails | null, fallback = 'Debt strategy unavailable right now.'): string => {
  if (!problem) {
    return fallback;
  }

  if (problem.errors) {
    const messages = Object.values(problem.errors).flat();
    if (messages.length > 0) {
      return messages.join(' ');
    }
  }

  return problem.detail ?? problem.title ?? fallback;
};

const toErrorMessage = (error: unknown, fallback: string): string => (error instanceof Error ? error.message : fallback);

const readErrorResponse = async (response: Response): Promise<string> => {
  const responseText = await response.text().catch(() => '');
  if (!responseText.trim()) {
    return `Debt strategy request failed with HTTP ${response.status}.`;
  }

  try {
    return getProblemMessage(JSON.parse(responseText) as ValidationProblemDetails, responseText);
  } catch {
    return responseText.length > 240 ? `${responseText.slice(0, 240)}...` : responseText;
  }
};

const shouldUseLocalStrategyFallback = (error: unknown): boolean => {
  if (error instanceof TypeError) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  return /HTTP 404|HTTP 500|HTTP 502|HTTP 503|HTTP 504|proxy|fetch|Failed to fetch|NetworkError/i.test(error.message);
};

const getMonthlyInterestCents = (balanceCents: number, annualAprPercent: number): number => {
  if (annualAprPercent <= 0 || balanceCents <= 0) {
    return 0;
  }

  return Math.round(balanceCents * (annualAprPercent / 100 / 12));
};

const buildLocalDebtStrategy = (monthlyBudgetCents: number, debts: StrategyDebtInput[]): DebtStrategyResponse => {
  const totalMinimumPaymentCents = debts.reduce((sum, debt) => sum + debt.minimumPaymentCents, 0);
  if (monthlyBudgetCents < totalMinimumPaymentCents) {
    throw new Error('Monthly budget must be at least the total minimum payment.');
  }

  const firstMonthInterestCents = debts.reduce((sum, debt) => sum + getMonthlyInterestCents(debt.currentBalanceCents, debt.annualAprPercent), 0);
  if (firstMonthInterestCents > 0 && monthlyBudgetCents <= firstMonthInterestCents) {
    throw new Error('Monthly budget must exceed first-month aggregate interest.');
  }

  const snowball = simulateLocalStrategy(
    'Snowball',
    monthlyBudgetCents,
    [...debts].sort((a, b) => {
      const byBalance = a.currentBalanceCents - b.currentBalanceCents;
      if (byBalance !== 0) {
        return byBalance;
      }

      const byApr = b.annualAprPercent - a.annualAprPercent;
      if (byApr !== 0) {
        return byApr;
      }

      return a.name.localeCompare(b.name) || a.clientDebtId.localeCompare(b.clientDebtId);
    })
  );
  const avalanche = simulateLocalStrategy(
    'Avalanche',
    monthlyBudgetCents,
    [...debts].sort((a, b) => {
      const byApr = b.annualAprPercent - a.annualAprPercent;
      if (byApr !== 0) {
        return byApr;
      }

      const byBalance = a.currentBalanceCents - b.currentBalanceCents;
      if (byBalance !== 0) {
        return byBalance;
      }

      return a.name.localeCompare(b.name) || a.clientDebtId.localeCompare(b.clientDebtId);
    })
  );

  const snowballInterestCents = toCurrencyCents(snowball.totalInterestPaid);
  const avalancheInterestCents = toCurrencyCents(avalanche.totalInterestPaid);
  const recommendedStrategy =
    snowballInterestCents === avalancheInterestCents
      ? 'Tie'
      : snowballInterestCents < avalancheInterestCents
        ? 'Snowball'
        : 'Avalanche';

  return {
    monthlyBudget: monthlyBudgetCents / 100,
    monthlyBudgetDisplay: formatCurrency(monthlyBudgetCents),
    totalMinimumPayment: totalMinimumPaymentCents / 100,
    totalMinimumPaymentDisplay: formatCurrency(totalMinimumPaymentCents),
    recommendedStrategy,
    snowball,
    avalanche,
    calculationVersion: 'local-v1.0',
    traceId: 'local-estimate'
  };
};

const simulateLocalStrategy = (strategy: string, monthlyBudgetCents: number, orderedDebts: StrategyDebtInput[]): DebtStrategyPlan => {
  const states = orderedDebts.map((debt, priority) => ({
    ...debt,
    priority,
    startingBalanceCents: debt.currentBalanceCents,
    balanceCents: debt.currentBalanceCents,
    payoffMonth: null as number | null
  }));
  const timeline: DebtStrategyMonth[] = [];
  let totalPaidCents = 0;
  let totalInterestCents = 0;
  let monthNumber = 0;

  while (states.some(debt => debt.balanceCents > 0)) {
    monthNumber++;
    if (monthNumber > 3600) {
      throw new Error('Debt strategy calculation exceeded the supported duration.');
    }

    const activeStates = states.filter(debt => debt.balanceCents > 0);
    const monthStartingBalanceCents = activeStates.reduce((sum, debt) => sum + debt.balanceCents, 0);
    const monthDebts = new Map(
      activeStates.map(debt => [
        debt.clientDebtId,
        {
          clientDebtId: debt.clientDebtId,
          name: debt.name,
          startingBalanceCents: debt.balanceCents,
          interestChargedCents: 0,
          paymentAppliedCents: 0,
          minimumPaymentAppliedCents: 0,
          extraPaymentAppliedCents: 0,
          endingBalanceCents: debt.balanceCents,
          isTargeted: false,
          isPaidOffThisMonth: false
        }
      ])
    );
    let monthInterestCents = 0;
    let monthPaymentCents = 0;

    for (const debt of activeStates) {
      const interestCents = getMonthlyInterestCents(debt.balanceCents, debt.annualAprPercent);
      debt.balanceCents += interestCents;
      const monthDebt = monthDebts.get(debt.clientDebtId);
      if (monthDebt) {
        monthDebt.interestChargedCents += interestCents;
      }
      monthInterestCents += interestCents;
      totalInterestCents += interestCents;
    }

    let remainingBudgetCents = monthlyBudgetCents;
    for (const debt of states.filter(item => item.balanceCents > 0)) {
      const paymentCents = Math.min(debt.minimumPaymentCents, debt.balanceCents, remainingBudgetCents);
      debt.balanceCents -= paymentCents;
      const monthDebt = monthDebts.get(debt.clientDebtId);
      if (monthDebt) {
        monthDebt.paymentAppliedCents += paymentCents;
        monthDebt.minimumPaymentAppliedCents += paymentCents;
      }
      remainingBudgetCents -= paymentCents;
      monthPaymentCents += paymentCents;
      totalPaidCents += paymentCents;
    }

    while (remainingBudgetCents > 0) {
      const target = states.filter(debt => debt.balanceCents > 0).sort((a, b) => a.priority - b.priority)[0];
      if (!target) {
        break;
      }

      const paymentCents = Math.min(target.balanceCents, remainingBudgetCents);
      target.balanceCents -= paymentCents;
      const monthDebt = monthDebts.get(target.clientDebtId);
      if (monthDebt) {
        monthDebt.isTargeted = true;
        monthDebt.paymentAppliedCents += paymentCents;
        monthDebt.extraPaymentAppliedCents += paymentCents;
      }
      remainingBudgetCents -= paymentCents;
      monthPaymentCents += paymentCents;
      totalPaidCents += paymentCents;
    }

    for (const debt of states) {
      const monthDebt = monthDebts.get(debt.clientDebtId);
      if (!monthDebt) {
        continue;
      }

      monthDebt.endingBalanceCents = Math.max(debt.balanceCents, 0);
      if (monthDebt.startingBalanceCents > 0 && debt.balanceCents <= 0 && debt.payoffMonth === null) {
        debt.payoffMonth = monthNumber;
        monthDebt.isPaidOffThisMonth = true;
      }
    }

    timeline.push({
      monthNumber,
      startingBalance: monthStartingBalanceCents / 100,
      interestCharged: monthInterestCents / 100,
      paymentApplied: monthPaymentCents / 100,
      endingBalance: states.reduce((sum, debt) => sum + debt.balanceCents, 0) / 100,
      debts: [...monthDebts.values()]
        .sort((a, b) => {
          const left = states.find(debt => debt.clientDebtId === a.clientDebtId)?.priority ?? 0;
          const right = states.find(debt => debt.clientDebtId === b.clientDebtId)?.priority ?? 0;
          return left - right;
        })
        .map(debt => ({
          clientDebtId: debt.clientDebtId,
          name: debt.name,
          startingBalance: debt.startingBalanceCents / 100,
          interestCharged: debt.interestChargedCents / 100,
          paymentApplied: debt.paymentAppliedCents / 100,
          minimumPaymentApplied: debt.minimumPaymentAppliedCents / 100,
          extraPaymentApplied: debt.extraPaymentAppliedCents / 100,
          endingBalance: debt.endingBalanceCents / 100,
          isTargeted: debt.isTargeted,
          isPaidOffThisMonth: debt.isPaidOffThisMonth
        }))
    });
  }

  return {
    strategy,
    monthsToPayoff: monthNumber,
    totalPaid: totalPaidCents / 100,
    totalInterestPaid: totalInterestCents / 100,
    totalPaidDisplay: formatCurrency(totalPaidCents),
    totalInterestDisplay: formatCurrency(totalInterestCents),
    finalPayoffDateLabel: formatMonthLabel(monthNumber),
    payoffOrder: states
      .sort((a, b) => a.priority - b.priority)
      .map(debt => ({
        clientDebtId: debt.clientDebtId,
        name: debt.name,
        payoffMonth: debt.payoffMonth ?? monthNumber,
        startingBalance: debt.startingBalanceCents / 100,
        annualAprPercent: debt.annualAprPercent
      })),
    timeline
  };
};

const directionForType = (type: DebtLedgerEntryType, currentDirection: DebtLedgerEntryDirection = 'decrease'): DebtLedgerEntryDirection => {
  if (type === 'payment') {
    return 'decrease';
  }

  if (type === 'interest' || type === 'fee') {
    return 'increase';
  }

  return currentDirection;
};

const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read file.'));
    reader.readAsText(file);
  });

const downloadTextFile = (fileName: string, contents: string, mimeType: string) => {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

const getDefaultFocusedStrategy = (strategy: DebtStrategyResponse): StrategyKey =>
  toCurrencyCents(strategy.avalanche.totalInterestPaid) < toCurrencyCents(strategy.snowball.totalInterestPaid) ? 'avalanche' : 'snowball';

const getStrategyBadge = (strategy: DebtStrategyResponse, plan: 'Snowball' | 'Avalanche'): StrategyBadge => {
  const snowballInterestCents = toCurrencyCents(strategy.snowball.totalInterestPaid);
  const avalancheInterestCents = toCurrencyCents(strategy.avalanche.totalInterestPaid);

  if (snowballInterestCents === avalancheInterestCents) {
    return 'same';
  }

  const lowestPlan = snowballInterestCents < avalancheInterestCents ? 'Snowball' : 'Avalanche';
  return lowestPlan === plan ? 'lowest' : null;
};

const getPaidOffDebtNames = (month: DebtStrategyMonth): string =>
  month.debts.filter(debt => debt.isPaidOffThisMonth).map(debt => debt.name).join(', ') || '-';

const getExtraPaymentKey = (month: DebtStrategyMonth): string => {
  const extraPayments = month.debts
    .filter(debt => debt.extraPaymentApplied > 0)
    .map(debt => `${debt.clientDebtId}:${toCurrencyCents(debt.extraPaymentApplied)}`);

  return extraPayments.length > 0 ? extraPayments.join('|') : 'minimums-only';
};

const getRelevantTimelineRows = (timeline: DebtStrategyMonth[]): DebtStrategyMonth[] => {
  const rows = new Map<number, DebtStrategyMonth>();
  let previousExtraPayment = '';

  for (const month of timeline) {
    const extraPayment = getExtraPaymentKey(month);
    const isFirstMonth = month.monthNumber === 1;
    const isFinalMonth = month.monthNumber === timeline[timeline.length - 1]?.monthNumber;
    const hasPayoff = month.debts.some(debt => debt.isPaidOffThisMonth);
    const hasExtraPaymentChange = extraPayment !== previousExtraPayment;

    if (isFirstMonth || isFinalMonth || hasPayoff || hasExtraPaymentChange) {
      rows.set(month.monthNumber, month);
    }

    previousExtraPayment = extraPayment;
  }

  return [...rows.values()];
};

export default function DebtLogPage() {
  const [activeView, setActiveView] = useState<ActiveView>('planner');
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<DebtLedgerEntry[]>([]);
  const [debtForm, setDebtForm] = useState<DebtFormState>(initialDebtForm);
  const [debtFormError, setDebtFormError] = useState<string | null>(null);
  const [ledgerForm, setLedgerForm] = useState<LedgerEntryFormState>({ ...initialLedgerForm, date: todayString() });
  const [ledgerFormError, setLedgerFormError] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [plannerBudget, setPlannerBudget] = useState('');
  const [hasCustomPlannerBudget, setHasCustomPlannerBudget] = useState(false);
  const [strategy, setStrategy] = useState<DebtStrategyResponse | null>(null);
  const [focusedStrategy, setFocusedStrategy] = useState<StrategyKey>('snowball');
  const [strategyError, setStrategyError] = useState<string | null>(null);
  const [strategyNotice, setStrategyNotice] = useState<string | null>(null);
  const [dataStatus, setDataStatus] = useState<string | null>(null);
  const [dataErrors, setDataErrors] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingDebt, setIsAddingDebt] = useState(false);
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [isRunningStrategy, setIsRunningStrategy] = useState(false);

  const refreshFromStorage = useCallback(async (showInitialLoading = false) => {
    if (showInitialLoading) {
      setIsLoading(true);
    }

    try {
      const [nextDebts, nextLedgerEntries] = await Promise.all([getDebts(), getDebtLedgerEntries()]);
      setDebts(nextDebts);
      setLedgerEntries(nextLedgerEntries);
      setError(null);
    } catch (storageError) {
      setError(toErrorMessage(storageError, 'Unable to load local debt log data.'));
    } finally {
      if (showInitialLoading) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    refreshFromStorage(true).catch(() => {
      setError('Unable to load local debt log data.');
      setIsLoading(false);
    });
  }, [refreshFromStorage]);

  const entriesByDebt = useMemo(() => groupLedgerEntriesByDebt(ledgerEntries), [ledgerEntries]);

  const debtRows = useMemo(
    () =>
      debts.map(debt => {
        const entries = entriesByDebt[debt.id] ?? [];
        const metrics = getDebtMetrics(debt, entries);
        return { debt, entries, metrics };
      }),
    [debts, entriesByDebt]
  );

  const overall = useMemo(() => {
    return debtRows.reduce(
      (acc, row) => {
        acc.opening += row.debt.openingBalanceCents;
        acc.current += row.metrics.currentBalanceCents;
        acc.minimums += row.metrics.currentBalanceCents > 0 ? row.debt.minimumPaymentCents : 0;
        acc.payments += row.metrics.totalPaymentsCents;
        acc.interestAndFees += row.metrics.totalInterestCents + row.metrics.totalFeesCents;
        return acc;
      },
      { opening: 0, current: 0, minimums: 0, payments: 0, interestAndFees: 0 }
    );
  }, [debtRows]);

  useEffect(() => {
    if (!hasCustomPlannerBudget && overall.minimums > 0) {
      setPlannerBudget(centsToInput(overall.minimums));
    }
  }, [hasCustomPlannerBudget, overall.minimums]);

  useEffect(() => {
    if (!ledgerForm.debtId && debts.length > 0) {
      setLedgerForm(prev => ({ ...prev, debtId: debts[0].id }));
    }
  }, [debts, ledgerForm.debtId]);

  const resetLedgerForm = () => {
    setLedgerForm({
      ...initialLedgerForm,
      debtId: debts[0]?.id ?? '',
      date: todayString()
    });
    setEditingEntryId(null);
    setLedgerFormError(null);
  };

  const handleDebtFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDebtFormError(null);

    const openingBalanceCents = parseCurrencyInputToCents(debtForm.openingBalance);
    const minimumPaymentCents = parseCurrencyInputToCents(debtForm.minimumPayment);
    const annualAprPercent = parseAprInput(debtForm.annualAprPercent);
    const trimmedName = debtForm.name.trim();

    if (!trimmedName) {
      setDebtFormError('Debt name is required.');
      return;
    }

    if (openingBalanceCents === null) {
      setDebtFormError('Opening balance must be greater than zero.');
      return;
    }

    if (annualAprPercent === null) {
      setDebtFormError('Annual APR must be a number between 0 and 100.');
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
        openingBalanceCents,
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

  const handleLedgerTypeChange = (type: DebtLedgerEntryType) => {
    setLedgerForm(prev => ({
      ...prev,
      type,
      direction: directionForType(type, prev.direction)
    }));
  };

  const handleLedgerSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLedgerFormError(null);

    const amountCents = parseCurrencyInputToCents(ledgerForm.amount);
    if (!ledgerForm.debtId) {
      setLedgerFormError('Select a debt.');
      return;
    }

    if (amountCents === null) {
      setLedgerFormError('Entry amount must be greater than zero.');
      return;
    }

    if (!ledgerForm.date.trim()) {
      setLedgerFormError('Entry date is required.');
      return;
    }

    const direction = directionForType(ledgerForm.type, ledgerForm.direction);
    setIsSavingEntry(true);
    try {
      if (editingEntryId) {
        await updateDebtLedgerEntry(editingEntryId, {
          debtId: ledgerForm.debtId,
          type: ledgerForm.type,
          direction,
          amountCents,
          date: ledgerForm.date,
          note: ledgerForm.note
        });
      } else {
        await addDebtLedgerEntry({
          debtId: ledgerForm.debtId,
          type: ledgerForm.type,
          direction,
          amountCents,
          date: ledgerForm.date,
          note: ledgerForm.note
        });
      }

      resetLedgerForm();
      await refreshFromStorage();
    } catch (submitError) {
      setLedgerFormError(toErrorMessage(submitError, 'Unable to save ledger entry right now.'));
    } finally {
      setIsSavingEntry(false);
    }
  };

  const handleEditEntry = (entry: DebtLedgerEntry) => {
    setEditingEntryId(entry.id);
    setLedgerForm({
      debtId: entry.debtId,
      type: entry.type,
      direction: entry.direction,
      amount: centsToInput(entry.amountCents),
      date: entry.date,
      note: entry.note ?? ''
    });
    setActiveView('ledger');
    setLedgerFormError(null);
  };

  const handleDeleteEntry = async (entry: DebtLedgerEntry) => {
    if (!window.confirm('Delete this ledger entry?')) {
      return;
    }

    try {
      await deleteDebtLedgerEntry(entry.id);
      await refreshFromStorage();
    } catch (deleteError) {
      setLedgerFormError(toErrorMessage(deleteError, 'Unable to delete ledger entry right now.'));
    }
  };

  const handleDeleteDebt = async (debt: DebtRecord) => {
    if (!window.confirm(`Delete ${debt.name} and its ledger entries?`)) {
      return;
    }

    try {
      await deleteDebt(debt.id);
      await refreshFromStorage();
      setStrategy(null);
    } catch (deleteError) {
      setError(toErrorMessage(deleteError, 'Unable to delete debt right now.'));
    }
  };

  const runStrategy = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setStrategyError(null);
    setStrategyNotice(null);

    const monthlyBudgetCents = parseCurrencyInputToCents(plannerBudget);
    if (monthlyBudgetCents === null) {
      setStrategyError('Monthly payoff budget must be greater than zero.');
      return;
    }

    const strategyDebts: StrategyDebtInput[] = debtRows
      .filter(row => row.metrics.currentBalanceCents > 0)
      .map(row => ({
        clientDebtId: row.debt.id,
        name: row.debt.name,
        currentBalanceCents: row.metrics.currentBalanceCents,
        annualAprPercent: row.debt.annualAprPercent,
        minimumPaymentCents: row.debt.minimumPaymentCents
      }));

    if (strategyDebts.length === 0) {
      setStrategyError('Add an active debt balance before running a strategy.');
      return;
    }

    setIsRunningStrategy(true);
    try {
      const response = await fetch('/api/v1/debt/strategy', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            monthlyBudget: Number((monthlyBudgetCents / 100).toFixed(2)),
          debts: strategyDebts.map(debt => ({
            clientDebtId: debt.clientDebtId,
            name: debt.name,
            currentBalance: Number((debt.currentBalanceCents / 100).toFixed(2)),
            annualAprPercent: debt.annualAprPercent,
            minimumPayment: Number((debt.minimumPaymentCents / 100).toFixed(2))
          })),
          clientReference: 'debt-log-strategy',
          requestedAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(await readErrorResponse(response));
      }

      const body = (await response.json()) as DebtStrategyResponse;
      setStrategy(body);
      setFocusedStrategy(getDefaultFocusedStrategy(body));
    } catch (strategyRunError) {
      if (shouldUseLocalStrategyFallback(strategyRunError)) {
        try {
          const localStrategy = buildLocalDebtStrategy(monthlyBudgetCents, strategyDebts);
          setStrategy(localStrategy);
          setFocusedStrategy(getDefaultFocusedStrategy(localStrategy));
          setStrategyNotice('Using a local estimate because the API is unavailable.');
        } catch (fallbackError) {
          setStrategyError(toErrorMessage(fallbackError, 'Debt strategy unavailable right now.'));
        }
      } else {
        setStrategyError(toErrorMessage(strategyRunError, 'Debt strategy unavailable right now.'));
      }
    } finally {
      setIsRunningStrategy(false);
    }
  };

  const handleDebtsCsvImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    setDataStatus(null);
    setDataErrors([]);
    try {
      const result = await importDebtsCsv(await readFileAsText(file));
      if (result.errors.length > 0) {
        setDataErrors(result.errors);
        return;
      }

      setDataStatus(`Imported ${result.importedCount.toLocaleString()} debt rows.`);
      await refreshFromStorage();
    } catch (importError) {
      setDataErrors([toErrorMessage(importError, 'Unable to import debts CSV.')]);
    }
  };

  const handleLedgerCsvImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    setDataStatus(null);
    setDataErrors([]);
    try {
      const result = await importLedgerEntriesCsv(await readFileAsText(file));
      if (result.errors.length > 0) {
        setDataErrors(result.errors);
        return;
      }

      setDataStatus(`Imported ${result.importedCount.toLocaleString()} ledger rows.`);
      await refreshFromStorage();
    } catch (importError) {
      setDataErrors([toErrorMessage(importError, 'Unable to import ledger CSV.')]);
    }
  };

  const handleJsonRestore = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    setDataStatus(null);
    setDataErrors([]);
    try {
      const snapshot = JSON.parse(await readFileAsText(file)) as DebtLogSnapshot;
      if (!window.confirm('Restore this backup and replace current debt log data?')) {
        return;
      }

      await restoreDebtLogSnapshot(snapshot);
      if (snapshot.settings?.plannerMonthlyBudgetCents) {
        setPlannerBudget(centsToInput(snapshot.settings.plannerMonthlyBudgetCents));
        setHasCustomPlannerBudget(true);
      }
      setStrategy(null);
      setDataStatus('Debt log backup restored.');
      await refreshFromStorage();
    } catch (restoreError) {
      setDataErrors([toErrorMessage(restoreError, 'Unable to restore debt log backup.')]);
    }
  };

  const exportJsonBackup = async () => {
    const monthlyBudgetCents = parseCurrencyInputToCents(plannerBudget) ?? undefined;
    const snapshot = await getDebtLogSnapshot({ plannerMonthlyBudgetCents: monthlyBudgetCents });
    downloadTextFile('debt-log-backup.json', JSON.stringify(snapshot, null, 2), 'application/json');
  };

  const tabClass = (view: ActiveView): string =>
    `rounded-xl px-4 py-2 text-sm font-medium transition ${
      activeView === view
        ? 'bg-brand-500/20 text-brand-100 ring-1 ring-brand-400/50'
        : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
    }`;

  const focusedPlan = strategy ? (focusedStrategy === 'snowball' ? strategy.snowball : strategy.avalanche) : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-wide text-brand-300">Debt Log</p>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">Track debt balances and payoff strategy</h1>
          <p className="text-sm text-slate-300">Debt records stay in this browser.</p>
        </header>

        <section className="grid gap-3 md:grid-cols-5">
          <SummaryCard label="Opening debt" value={formatCurrency(overall.opening)} />
          <SummaryCard label="Current balance" value={formatCurrency(overall.current)} />
          <SummaryCard label="Minimums" value={formatCurrency(overall.minimums)} />
          <SummaryCard label="Payments" value={formatCurrency(overall.payments)} accent />
          <SummaryCard label="Interest + fees" value={formatCurrency(overall.interestAndFees)} />
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-slate-900/30">
          <h2 className="text-xl font-semibold text-white">Add debt</h2>
          <form className="mt-5 grid gap-4 md:grid-cols-4" onSubmit={handleDebtFormSubmit}>
            <label className="flex flex-col gap-2 md:col-span-2">
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
              <span className="text-sm text-slate-200">Opening balance ($)</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                onKeyDown={preventInvalidNumericInput}
                value={debtForm.openingBalance}
                onChange={event => setDebtForm(prev => ({ ...prev, openingBalance: event.target.value }))}
                className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-slate-100 outline-none transition focus:border-brand-400"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm text-slate-200">Annual APR (%)</span>
              <input
                type="number"
                min="0"
                max="100"
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

            <div className="flex items-end">
              <button
                type="submit"
                disabled={isAddingDebt}
                className="w-full rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAddingDebt ? 'Adding...' : 'Add debt'}
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

        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setActiveView('planner')} className={tabClass('planner')}>
            Planner
          </button>
          <button type="button" onClick={() => setActiveView('ledger')} className={tabClass('ledger')}>
            Ledger
          </button>
          <button type="button" onClick={() => setActiveView('data')} className={tabClass('data')}>
            Data
          </button>
        </div>

        {isLoading ? <p className="text-sm text-slate-300">Loading debt log...</p> : null}

        {!isLoading && debts.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/30 p-6 text-sm text-slate-300">
            No debts yet. Add your first debt above.
          </section>
        ) : null}

        {activeView === 'planner' ? (
          <PlannerView
            debtCount={debtRows.filter(row => row.metrics.currentBalanceCents > 0).length}
            focusedPlan={focusedPlan}
            focusedStrategy={focusedStrategy}
            isRunningStrategy={isRunningStrategy}
            onFocusedStrategyChange={setFocusedStrategy}
            onRunStrategy={runStrategy}
            onBudgetChange={value => {
              setPlannerBudget(value);
              setHasCustomPlannerBudget(true);
            }}
            plannerBudget={plannerBudget}
            strategy={strategy}
            strategyError={strategyError}
            strategyNotice={strategyNotice}
          />
        ) : null}

        {activeView === 'ledger' ? (
          <LedgerView
            debtRows={debtRows}
            editingEntryId={editingEntryId}
            isSavingEntry={isSavingEntry}
            ledgerForm={ledgerForm}
            ledgerFormError={ledgerFormError}
            onCancelEdit={resetLedgerForm}
            onDeleteDebt={handleDeleteDebt}
            onDeleteEntry={handleDeleteEntry}
            onEditEntry={handleEditEntry}
            onLedgerFormChange={setLedgerForm}
            onLedgerSubmit={handleLedgerSubmit}
            onLedgerTypeChange={handleLedgerTypeChange}
          />
        ) : null}

        {activeView === 'data' ? (
          <DataView
            dataErrors={dataErrors}
            dataStatus={dataStatus}
            debts={debts}
            ledgerEntries={ledgerEntries}
            onDebtsCsvImport={handleDebtsCsvImport}
            onExportDebtsCsv={() => downloadTextFile('debts.csv', exportDebtsCsv(debts), 'text/csv')}
            onExportJsonBackup={exportJsonBackup}
            onExportLedgerCsv={() => downloadTextFile('ledger_entries.csv', exportLedgerEntriesCsv(ledgerEntries), 'text/csv')}
            onJsonRestore={handleJsonRestore}
            onLedgerCsvImport={handleLedgerCsvImport}
          />
        ) : null}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-2 text-xl font-semibold ${accent ? 'text-brand-200' : 'text-white'}`}>{value}</p>
    </article>
  );
}

function PlannerView({
  debtCount,
  focusedPlan,
  focusedStrategy,
  isRunningStrategy,
  onBudgetChange,
  onFocusedStrategyChange,
  onRunStrategy,
  plannerBudget,
  strategy,
  strategyError,
  strategyNotice
}: {
  debtCount: number;
  focusedPlan: DebtStrategyPlan | null;
  focusedStrategy: StrategyKey;
  isRunningStrategy: boolean;
  onBudgetChange: (value: string) => void;
  onFocusedStrategyChange: (strategy: StrategyKey) => void;
  onRunStrategy: (event?: FormEvent<HTMLFormElement>) => void;
  plannerBudget: string;
  strategy: DebtStrategyResponse | null;
  strategyError: string | null;
  strategyNotice: string | null;
}) {
  return (
    <section className="space-y-5">
      <form className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6" onSubmit={onRunStrategy}>
        <div className="grid gap-4 md:grid-cols-[1fr,auto] md:items-end">
          <label className="flex flex-col gap-2">
            <span className="text-sm text-slate-200">Monthly payoff budget ($)</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              onKeyDown={preventInvalidNumericInput}
              value={plannerBudget}
              onChange={event => onBudgetChange(event.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-slate-100 outline-none transition focus:border-brand-400"
            />
          </label>
          <button
            type="submit"
            disabled={isRunningStrategy || debtCount === 0}
            className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRunningStrategy ? 'Running...' : 'Compare strategies'}
          </button>
        </div>
        {strategyError ? <p className="mt-3 text-sm text-rose-300">{strategyError}</p> : null}
        {strategyNotice ? <p className="mt-3 text-sm text-amber-200">{strategyNotice}</p> : null}
      </form>

      {strategy ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <StrategyPlanCard plan={strategy.snowball} badge={getStrategyBadge(strategy, 'Snowball')} />
          <StrategyPlanCard plan={strategy.avalanche} badge={getStrategyBadge(strategy, 'Avalanche')} />
        </div>
      ) : null}

      {focusedPlan ? (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">Payment allocation</h2>
              <p className="mt-1 text-sm text-slate-300">{focusedPlan.strategy} plan</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onFocusedStrategyChange('snowball')}
                className={`rounded-lg px-3 py-2 text-sm ${
                  focusedStrategy === 'snowball' ? 'bg-brand-500/20 text-brand-100' : 'bg-slate-950 text-slate-300'
                }`}
              >
                Snowball
              </button>
              <button
                type="button"
                onClick={() => onFocusedStrategyChange('avalanche')}
                className={`rounded-lg px-3 py-2 text-sm ${
                  focusedStrategy === 'avalanche' ? 'bg-brand-500/20 text-brand-100' : 'bg-slate-950 text-slate-300'
                }`}
              >
                Avalanche
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-3 py-2">Month</th>
                  <th className="px-3 py-2">Extra payment</th>
                  <th className="px-3 py-2">Paid off</th>
                  <th className="px-3 py-2">All payments</th>
                  <th className="px-3 py-2">Interest</th>
                  <th className="px-3 py-2">Ending</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {getRelevantTimelineRows(focusedPlan.timeline).map(month => (
                  <tr key={month.monthNumber} className="text-slate-200">
                    <td className="px-3 py-2 font-medium text-white">{month.monthNumber}</td>
                    <td className="px-3 py-2">
                      <PaymentBreakdown debts={month.debts} amountSelector={debt => debt.extraPaymentApplied} emptyLabel="Minimums only" prefix="+" />
                    </td>
                    <td className="px-3 py-2">{getPaidOffDebtNames(month)}</td>
                    <td className="px-3 py-2 text-slate-300">
                      <PaymentBreakdown debts={month.debts} amountSelector={debt => debt.paymentApplied} />
                    </td>
                    <td className="px-3 py-2">{formatDecimalCurrency(month.interestCharged)}</td>
                    <td className="px-3 py-2">{formatDecimalCurrency(month.endingBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </section>
  );
}

function PaymentBreakdown({
  amountSelector,
  debts,
  emptyLabel = '-',
  prefix = ''
}: {
  amountSelector: (debt: DebtStrategyMonthDebt) => number;
  debts: DebtStrategyMonthDebt[];
  emptyLabel?: string;
  prefix?: string;
}) {
  const payments = debts.filter(debt => amountSelector(debt) > 0);

  if (payments.length === 0) {
    return <span className="text-slate-400">{emptyLabel}</span>;
  }

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {payments.map(debt => (
        <span key={debt.clientDebtId} className="whitespace-nowrap">
          <span className="text-slate-100">{debt.name}</span>{' '}
          <span className="text-slate-300">
            {prefix}
            {formatDecimalCurrency(amountSelector(debt))}
          </span>
        </span>
      ))}
    </div>
  );
}

function StrategyPlanCard({ plan, badge }: { plan: DebtStrategyPlan; badge: StrategyBadge }) {
  const badgeClassName =
    badge === 'lowest'
      ? 'bg-emerald-500/15 text-emerald-200'
      : badge === 'same'
        ? 'bg-amber-500/15 text-amber-100'
        : '';
  const badgeText = badge === 'lowest' ? 'Lowest interest' : badge === 'same' ? 'Same interest' : '';

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">{plan.strategy}</h2>
          <p className="mt-1 text-sm text-slate-300">{plan.finalPayoffDateLabel}</p>
        </div>
        {badge ? <span className={`rounded-full px-3 py-1 text-xs font-medium ${badgeClassName}`}>{badgeText}</span> : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Months" value={plan.monthsToPayoff.toLocaleString()} />
        <SummaryCard label="Total paid" value={plan.totalPaidDisplay} />
        <SummaryCard label="Interest" value={plan.totalInterestDisplay} />
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200">Extra-payment priority</h3>
        <ol className="mt-3 space-y-2">
          {plan.payoffOrder.map((item, index) => (
            <li key={item.clientDebtId} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 px-3 py-2 text-sm">
              <span className="text-slate-200">
                <span className="mr-2 text-slate-500">{index + 1}</span>
                <span className="font-medium text-white">{item.name}</span>
              </span>
              <span className="text-slate-400">Paid off month {item.payoffMonth}</span>
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
}

function LedgerView({
  debtRows,
  editingEntryId,
  isSavingEntry,
  ledgerForm,
  ledgerFormError,
  onCancelEdit,
  onDeleteDebt,
  onDeleteEntry,
  onEditEntry,
  onLedgerFormChange,
  onLedgerSubmit,
  onLedgerTypeChange
}: {
  debtRows: Array<{ debt: DebtRecord; entries: DebtLedgerEntry[]; metrics: ReturnType<typeof getDebtMetrics> }>;
  editingEntryId: string | null;
  isSavingEntry: boolean;
  ledgerForm: LedgerEntryFormState;
  ledgerFormError: string | null;
  onCancelEdit: () => void;
  onDeleteDebt: (debt: DebtRecord) => void;
  onDeleteEntry: (entry: DebtLedgerEntry) => void;
  onEditEntry: (entry: DebtLedgerEntry) => void;
  onLedgerFormChange: (nextForm: LedgerEntryFormState | ((prev: LedgerEntryFormState) => LedgerEntryFormState)) => void;
  onLedgerSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onLedgerTypeChange: (type: DebtLedgerEntryType) => void;
}) {
  const directionLocked = ledgerForm.type !== 'adjustment';

  return (
    <section className="space-y-5">
      <form className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6" onSubmit={onLedgerSubmit}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-white">{editingEntryId ? 'Edit ledger entry' : 'Add ledger entry'}</h2>
          {editingEntryId ? (
            <button type="button" onClick={onCancelEdit} className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700">
              Cancel edit
            </button>
          ) : null}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-2">
            <span className="text-sm text-slate-200">Debt</span>
            <select
              value={ledgerForm.debtId}
              onChange={event => onLedgerFormChange(prev => ({ ...prev, debtId: event.target.value }))}
              className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-slate-100 outline-none transition focus:border-brand-400"
            >
              <option value="">Select debt</option>
              {debtRows.map(row => (
                <option key={row.debt.id} value={row.debt.id}>
                  {row.debt.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm text-slate-200">Type</span>
            <select
              value={ledgerForm.type}
              onChange={event => onLedgerTypeChange(event.target.value as DebtLedgerEntryType)}
              className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-slate-100 outline-none transition focus:border-brand-400"
            >
              <option value="payment">Payment</option>
              <option value="interest">Interest</option>
              <option value="fee">Fee</option>
              <option value="adjustment">Adjustment</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm text-slate-200">Direction</span>
            <select
              value={directionForType(ledgerForm.type, ledgerForm.direction)}
              disabled={directionLocked}
              onChange={event => onLedgerFormChange(prev => ({ ...prev, direction: event.target.value as DebtLedgerEntryDirection }))}
              className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-slate-100 outline-none transition focus:border-brand-400 disabled:opacity-70"
            >
              <option value="decrease">Decrease balance</option>
              <option value="increase">Increase balance</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm text-slate-200">Amount ($)</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              onKeyDown={preventInvalidNumericInput}
              value={ledgerForm.amount}
              onChange={event => onLedgerFormChange(prev => ({ ...prev, amount: event.target.value }))}
              className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-slate-100 outline-none transition focus:border-brand-400"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm text-slate-200">Date</span>
            <input
              type="date"
              value={ledgerForm.date}
              onChange={event => onLedgerFormChange(prev => ({ ...prev, date: event.target.value }))}
              className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-slate-100 outline-none transition focus:border-brand-400"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm text-slate-200">Note</span>
            <input
              type="text"
              value={ledgerForm.note}
              onChange={event => onLedgerFormChange(prev => ({ ...prev, note: event.target.value }))}
              className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-slate-100 outline-none transition focus:border-brand-400"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={isSavingEntry || debtRows.length === 0}
          className="mt-4 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSavingEntry ? 'Saving...' : editingEntryId ? 'Save entry' : 'Add entry'}
        </button>
        {ledgerFormError ? <p className="mt-3 text-sm text-rose-300">{ledgerFormError}</p> : null}
      </form>

      <div className="grid gap-5">
        {debtRows.map(row => (
          <article key={row.debt.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">{row.debt.name}</h2>
                <p className="mt-1 text-sm text-slate-300">
                  APR {row.debt.annualAprPercent.toFixed(2)}% · Minimum {formatCurrency(row.debt.minimumPaymentCents)}
                </p>
              </div>
              <button type="button" onClick={() => onDeleteDebt(row.debt)} className="rounded-lg bg-rose-950/70 px-3 py-2 text-sm text-rose-100 hover:bg-rose-900">
                Delete debt
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <SummaryCard label="Current" value={formatCurrency(row.metrics.currentBalanceCents)} />
              <SummaryCard label="Payments" value={formatCurrency(row.metrics.totalPaymentsCents)} accent />
              <SummaryCard label="Interest" value={formatCurrency(row.metrics.totalInterestCents)} />
              <SummaryCard label="Progress" value={`${row.metrics.progressPercent.toFixed(1)}%`} />
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-brand-400 transition-all" style={{ width: `${row.metrics.progressPercent}%` }} />
            </div>

            {row.entries.length === 0 ? <p className="mt-4 text-sm text-slate-300">No ledger entries yet.</p> : null}
            {row.entries.length > 0 ? (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Direction</th>
                      <th className="px-3 py-2">Amount</th>
                      <th className="px-3 py-2">Note</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {row.entries.map(entry => (
                      <tr key={entry.id} className="text-slate-200">
                        <td className="px-3 py-2">{entry.date}</td>
                        <td className="px-3 py-2 capitalize">{entry.type}</td>
                        <td className="px-3 py-2">{entry.direction === 'increase' ? 'Increase' : 'Decrease'}</td>
                        <td className="px-3 py-2 font-medium text-white">{formatCurrency(entry.amountCents)}</td>
                        <td className="max-w-xs px-3 py-2 text-slate-300">{entry.note}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            <button type="button" onClick={() => onEditEntry(entry)} className="rounded-lg bg-slate-800 px-3 py-1 text-xs text-slate-100 hover:bg-slate-700">
                              Edit
                            </button>
                            <button type="button" onClick={() => onDeleteEntry(entry)} className="rounded-lg bg-rose-950/70 px-3 py-1 text-xs text-rose-100 hover:bg-rose-900">
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function DataView({
  dataErrors,
  dataStatus,
  debts,
  ledgerEntries,
  onDebtsCsvImport,
  onExportDebtsCsv,
  onExportJsonBackup,
  onExportLedgerCsv,
  onJsonRestore,
  onLedgerCsvImport
}: {
  dataErrors: string[];
  dataStatus: string | null;
  debts: DebtRecord[];
  ledgerEntries: DebtLedgerEntry[];
  onDebtsCsvImport: (event: ChangeEvent<HTMLInputElement>) => void;
  onExportDebtsCsv: () => void;
  onExportJsonBackup: () => void;
  onExportLedgerCsv: () => void;
  onJsonRestore: (event: ChangeEvent<HTMLInputElement>) => void;
  onLedgerCsvImport: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <section className="grid gap-5 lg:grid-cols-2">
      <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-xl font-semibold text-white">Export</h2>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={onExportDebtsCsv} disabled={debts.length === 0} className="rounded-xl bg-slate-800 px-4 py-2 text-sm text-slate-100 hover:bg-slate-700 disabled:opacity-50">
            Debts CSV
          </button>
          <button
            type="button"
            onClick={onExportLedgerCsv}
            disabled={ledgerEntries.length === 0}
            className="rounded-xl bg-slate-800 px-4 py-2 text-sm text-slate-100 hover:bg-slate-700 disabled:opacity-50"
          >
            Ledger CSV
          </button>
          <button type="button" onClick={onExportJsonBackup} className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-400">
            JSON backup
          </button>
        </div>
      </article>

      <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-xl font-semibold text-white">Import</h2>
        <div className="mt-5 flex flex-wrap gap-3">
          <label className="cursor-pointer rounded-xl bg-slate-800 px-4 py-2 text-sm text-slate-100 hover:bg-slate-700">
            Debts CSV
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={onDebtsCsvImport} />
          </label>
          <label className="cursor-pointer rounded-xl bg-slate-800 px-4 py-2 text-sm text-slate-100 hover:bg-slate-700">
            Ledger CSV
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={onLedgerCsvImport} />
          </label>
          <label className="cursor-pointer rounded-xl bg-rose-950/70 px-4 py-2 text-sm text-rose-100 hover:bg-rose-900">
            Restore JSON
            <input type="file" accept=".json,application/json" className="hidden" onChange={onJsonRestore} />
          </label>
        </div>
        {dataStatus ? <p className="mt-4 text-sm text-emerald-300">{dataStatus}</p> : null}
        {dataErrors.length > 0 ? (
          <ul className="mt-4 space-y-2 text-sm text-rose-300">
            {dataErrors.slice(0, 8).map(error => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : null}
      </article>
    </section>
  );
}
