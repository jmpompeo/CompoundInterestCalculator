import { FormEvent, KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  addCategory,
  archiveCategory,
  autoCopyBudgetsFromPreviousMonth,
  Category,
  Expense,
  addExpense,
  deleteExpense,
  getBudgetsByMonth,
  getCategories,
  getExpensesByMonth,
  getLastUsedCategory,
  getRecentMerchants,
  reorderCategories,
  seedDefaultCategories,
  setLastUsedCategory,
  updateExpense,
  upsertBudget
} from './expenseTracker';

type ExpenseFormState = {
  amount: string;
  date: string;
  categoryId: string;
  merchant: string;
  note: string;
  batchMode: boolean;
};

type TransactionSort = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'merchant-asc';

const today = new Date();
const monthString = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const dateString = (date: Date): string => `${monthString(date)}-${String(date.getDate()).padStart(2, '0')}`;
const formatCurrency = (cents: number): string => (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
const formatMonthLabel = (month: string): string => {
  const [year, monthPart] = month.split('-').map(Number);
  return new Date(year, monthPart - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};
const defaultDateForMonth = (month: string): string => (month === monthString(today) ? dateString(today) : `${month}-01`);

const parseCurrencyInputToCents = (value: string): number | null => {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100);
};

export default function ExpenseTrackerPage() {
  const [selectedMonth, setSelectedMonth] = useState(monthString(today));
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [merchantSuggestions, setMerchantSuggestions] = useState<string[]>([]);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [budgetInputs, setBudgetInputs] = useState<Record<string, string>>({});
  const [newCategoryName, setNewCategoryName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilterId, setCategoryFilterId] = useState('');
  const [minAmountFilter, setMinAmountFilter] = useState('');
  const [maxAmountFilter, setMaxAmountFilter] = useState('');
  const [sort, setSort] = useState<TransactionSort>('date-desc');
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [budgetNotice, setBudgetNotice] = useState<string | null>(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [form, setForm] = useState<ExpenseFormState>({
    amount: '',
    date: dateString(today),
    categoryId: '',
    merchant: '',
    note: '',
    batchMode: false
  });

  const formFieldRefs = useRef<Array<HTMLElement | null>>([]);

  const activeCategories = useMemo(
    () => categories.filter(category => !category.isArchived),
    [categories]
  );

  const activeCategoryIds = useMemo(
    () => activeCategories.map(category => category.id),
    [activeCategories]
  );

  const latestExpense = expenses[0] ?? null;

  const loadData = async (month: string) => {
    const copiedBudgets = await autoCopyBudgetsFromPreviousMonth(month);
    const [nextCategories, monthExpenses, monthBudgets, recentMerchants] = await Promise.all([
      getCategories(),
      getExpensesByMonth(month),
      getBudgetsByMonth(month),
      getRecentMerchants(10)
    ]);

    const budgetMap = monthBudgets.reduce<Record<string, number>>((acc, budget) => {
      acc[budget.categoryId] = budget.amountCents;
      return acc;
    }, {});

    setCategories(nextCategories);
    setExpenses(monthExpenses);
    setMerchantSuggestions(recentMerchants);
    setBudgets(budgetMap);
    setBudgetNotice(
      copiedBudgets.copiedCount > 0 && copiedBudgets.sourceMonth
        ? `Copied ${copiedBudgets.copiedCount} budget${copiedBudgets.copiedCount === 1 ? '' : 's'} from ${formatMonthLabel(copiedBudgets.sourceMonth)}.`
        : null
    );
    setBudgetInputs(
      nextCategories.reduce<Record<string, string>>((acc, category) => {
        acc[category.id] = budgetMap[category.id] ? String(budgetMap[category.id] / 100) : '';
        return acc;
      }, {})
    );

    setForm(prev => {
      const lastUsed = getLastUsedCategory();
      const nextActiveCategories = nextCategories.filter(category => !category.isArchived);
      const defaultCategory = lastUsed && nextActiveCategories.some(c => c.id === lastUsed) ? lastUsed : nextActiveCategories[0]?.id ?? '';
      const hasCurrentCategory = prev.categoryId && nextActiveCategories.some(category => category.id === prev.categoryId);
      const monthDate = prev.date.startsWith(month) ? prev.date : defaultDateForMonth(month);

      return {
        ...prev,
        categoryId: hasCurrentCategory ? prev.categoryId : defaultCategory,
        date: monthDate
      };
    });
  };

  useEffect(() => {
    const init = async () => {
      await seedDefaultCategories();
      setInitialized(true);
    };

    init().catch(() => setError('Unable to load your local expense data.'));
  }, []);

  useEffect(() => {
    if (!initialized) {
      return;
    }

    loadData(selectedMonth).catch(() => setError('Unable to refresh month data.'));
  }, [initialized, selectedMonth]);

  useEffect(() => {
    if (!showExpenseForm) {
      return;
    }

    formFieldRefs.current[0]?.focus();
  }, [showExpenseForm, editingExpenseId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || !event.shiftKey || event.key.toLowerCase() !== 'd') {
        return;
      }

      if (!latestExpense) {
        return;
      }

      event.preventDefault();
      setEditingExpenseId(null);
      setShowExpenseForm(true);
      setForm(prev => ({
        ...prev,
        amount: (latestExpense.amountCents / 100).toString(),
        date: defaultDateForMonth(selectedMonth),
        categoryId: activeCategoryIds.includes(latestExpense.categoryId) ? latestExpense.categoryId : activeCategories[0]?.id ?? '',
        merchant: latestExpense.merchant ?? '',
        note: latestExpense.note ?? ''
      }));
      setError(null);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeCategories, activeCategoryIds, latestExpense, selectedMonth]);

  const totalSpent = useMemo(() => expenses.reduce((sum, expense) => sum + expense.amountCents, 0), [expenses]);

  const spentByCategory = useMemo(() => {
    return expenses.reduce<Record<string, number>>((acc, expense) => {
      acc[expense.categoryId] = (acc[expense.categoryId] ?? 0) + expense.amountCents;
      return acc;
    }, {});
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const minAmountCents = minAmountFilter.trim() && Number.isFinite(Number(minAmountFilter)) ? Math.round(Number(minAmountFilter) * 100) : null;
    const maxAmountCents = maxAmountFilter.trim() && Number.isFinite(Number(maxAmountFilter)) ? Math.round(Number(maxAmountFilter) * 100) : null;
    const filtered = expenses.filter(expense => {
      if (query) {
        const merchant = expense.merchant?.toLowerCase() ?? '';
        const note = expense.note?.toLowerCase() ?? '';
        if (!merchant.includes(query) && !note.includes(query)) {
          return false;
        }
      }

      if (categoryFilterId && expense.categoryId !== categoryFilterId) {
        return false;
      }

      if (minAmountCents !== null && expense.amountCents < minAmountCents) {
        return false;
      }

      if (maxAmountCents !== null && expense.amountCents > maxAmountCents) {
        return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      if (sort === 'date-desc') {
        return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
      }

      if (sort === 'date-asc') {
        return a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);
      }

      if (sort === 'amount-desc') {
        return b.amountCents - a.amountCents || b.date.localeCompare(a.date);
      }

      if (sort === 'amount-asc') {
        return a.amountCents - b.amountCents || b.date.localeCompare(a.date);
      }

      const aLabel = (a.merchant || a.note || '').toLowerCase();
      const bLabel = (b.merchant || b.note || '').toLowerCase();
      return aLabel.localeCompare(bLabel) || b.date.localeCompare(a.date);
    });

    return filtered;
  }, [categoryFilterId, expenses, maxAmountFilter, minAmountFilter, searchQuery, sort]);

  const monthLabel = useMemo(() => formatMonthLabel(selectedMonth), [selectedMonth]);

  const changeMonth = (offset: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const next = new Date(year, month - 1 + offset, 1);
    setSelectedMonth(monthString(next));
  };

  const startAddExpense = () => {
    setEditingExpenseId(null);
    setShowExpenseForm(true);
    setForm(prev => ({
      ...prev,
      amount: '',
      date: defaultDateForMonth(selectedMonth),
      merchant: '',
      note: '',
      categoryId: prev.categoryId || activeCategories[0]?.id || ''
    }));
    setError(null);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setShowExpenseForm(true);
    setForm(prev => ({
      ...prev,
      amount: (expense.amountCents / 100).toString(),
      date: expense.date,
      categoryId: expense.categoryId,
      merchant: expense.merchant ?? '',
      note: expense.note ?? ''
    }));
  };

  const handleDuplicateLastExpense = () => {
    if (!latestExpense) {
      setError('No expenses available to duplicate.');
      return;
    }

    setEditingExpenseId(null);
    setShowExpenseForm(true);
    setForm(prev => ({
      ...prev,
      amount: (latestExpense.amountCents / 100).toString(),
      date: defaultDateForMonth(selectedMonth),
      categoryId: activeCategoryIds.includes(latestExpense.categoryId) ? latestExpense.categoryId : activeCategories[0]?.id ?? '',
      merchant: latestExpense.merchant ?? '',
      note: latestExpense.note ?? ''
    }));
    setError(null);
  };

  const moveCategory = async (categoryId: string, direction: -1 | 1) => {
    try {
      const index = activeCategoryIds.indexOf(categoryId);
      if (index < 0) {
        return;
      }

      const swapIndex = index + direction;
      if (swapIndex < 0 || swapIndex >= activeCategoryIds.length) {
        return;
      }

      const nextOrder = [...activeCategoryIds];
      [nextOrder[index], nextOrder[swapIndex]] = [nextOrder[swapIndex], nextOrder[index]];
      await reorderCategories(nextOrder);
      await loadData(selectedMonth);
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to reorder categories.');
    }
  };

  const handleAddCategory = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await addCategory(newCategoryName);
      setNewCategoryName('');
      await loadData(selectedMonth);
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to add category.');
    }
  };

  const handleArchiveCategory = async (categoryId: string) => {
    try {
      await archiveCategory(categoryId);
      await loadData(selectedMonth);
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to archive category.');
    }
  };

  const handleBudgetSave = async (categoryId: string) => {
    try {
      const amount = Number(budgetInputs[categoryId] ?? '0');
      if (!Number.isFinite(amount) || amount < 0) {
        setError('Budget must be zero or a positive value.');
        return;
      }

      const amountCents = Math.round(amount * 100);
      await upsertBudget(selectedMonth, categoryId, amountCents);
      setBudgets(prev => ({ ...prev, [categoryId]: amountCents }));
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save budget.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteExpense(id);
      await loadData(selectedMonth);
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to delete expense.');
    }
  };

  const resetFormForBatch = () => {
    setForm(prev => ({
      ...prev,
      amount: '',
      merchant: '',
      note: ''
    }));
  };

  const moveFocus = (index: number, direction: -1 | 1) => {
    let next = index + direction;

    while (next >= 0 && next < formFieldRefs.current.length) {
      const nextElement = formFieldRefs.current[next];
      if (nextElement) {
        nextElement.focus();
        return;
      }

      next += direction;
    }
  };

  const handleArrowNavigation = (index: number, event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveFocus(index, 1);
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveFocus(index, -1);
    }
  };

  const handleSubmitExpense = async (event: FormEvent) => {
    event.preventDefault();
    const amountCents = parseCurrencyInputToCents(form.amount);

    if (!amountCents) {
      setError('Amount is required and must be greater than zero.');
      return;
    }

    if (!form.categoryId) {
      setError('Please choose a category.');
      return;
    }

    const payload = {
      amountCents,
      date: form.date,
      categoryId: form.categoryId,
      merchant: form.merchant.trim() || undefined,
      note: form.note.trim() || undefined
    };

    try {
      if (editingExpenseId) {
        const current = expenses.find(expense => expense.id === editingExpenseId);
        if (!current) {
          setError('Expense no longer exists.');
          return;
        }

        await updateExpense({ ...current, ...payload });
      } else {
        await addExpense(payload);
      }

      setLastUsedCategory(form.categoryId);
      await loadData(selectedMonth);
      setError(null);

      if (editingExpenseId || !form.batchMode) {
        setShowExpenseForm(false);
        setEditingExpenseId(null);
        return;
      }

      resetFormForBatch();
      formFieldRefs.current[0]?.focus();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save expense.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Monthly Expense Tracker</h1>
          <p className="text-slate-300">Offline-first expense and budget tracking with local browser storage.</p>
        </header>

        <section className="rounded-2xl bg-slate-900 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button className="rounded border border-slate-700 px-3 py-1" onClick={() => changeMonth(-1)}>
                Prev
              </button>
              <p className="text-lg font-semibold">{monthLabel}</p>
              <button className="rounded border border-slate-700 px-3 py-1" onClick={() => changeMonth(1)}>
                Next
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button className="rounded border border-slate-700 px-4 py-2 text-sm" onClick={handleDuplicateLastExpense} disabled={!latestExpense}>
                Duplicate last
              </button>
              <button className="rounded bg-brand-600 px-4 py-2 font-semibold" onClick={startAddExpense}>
                Add Expense
              </button>
            </div>
          </div>
          <p className="text-sm text-slate-300">Total spent this month: <span className="font-semibold text-white">{formatCurrency(totalSpent)}</span></p>
          <p className="mt-2 text-xs text-slate-400">Shortcut: <span className="font-semibold text-slate-300">Ctrl/Cmd + Shift + D</span> loads your last expense for quick entry.</p>
        </section>

        {showExpenseForm && (
          <section className="rounded-2xl bg-slate-900 p-5">
            <h2 className="mb-3 text-xl font-semibold">{editingExpenseId ? 'Edit Expense' : 'Add Expense'}</h2>
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleSubmitExpense}>
              <label className="flex flex-col gap-1 text-sm">Amount ($)
                <input
                  ref={element => { formFieldRefs.current[0] = element; }}
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="rounded border border-slate-700 bg-slate-950 px-3 py-2"
                  value={form.amount}
                  onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
                  onKeyDown={event => handleArrowNavigation(0, event)}
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">Date
                <input
                  ref={element => { formFieldRefs.current[1] = element; }}
                  type="date"
                  className="rounded border border-slate-700 bg-slate-950 px-3 py-2"
                  value={form.date}
                  onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))}
                  onKeyDown={event => handleArrowNavigation(1, event)}
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">Category
                <select
                  ref={element => { formFieldRefs.current[2] = element; }}
                  className="rounded border border-slate-700 bg-slate-950 px-3 py-2"
                  value={form.categoryId}
                  onChange={e => setForm(prev => ({ ...prev, categoryId: e.target.value }))}
                  onKeyDown={event => handleArrowNavigation(2, event)}
                  required
                >
                  <option value="">Select category</option>
                  {categories.map(category => (
                    <option
                      key={category.id}
                      value={category.id}
                      disabled={category.isArchived && category.id !== form.categoryId}
                    >
                      {category.isArchived ? `${category.name} (archived)` : category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">Merchant
                <input
                  ref={element => { formFieldRefs.current[3] = element; }}
                  list="merchant-suggestions"
                  className="rounded border border-slate-700 bg-slate-950 px-3 py-2"
                  value={form.merchant}
                  onChange={e => setForm(prev => ({ ...prev, merchant: e.target.value }))}
                  onKeyDown={event => handleArrowNavigation(3, event)}
                />
                <datalist id="merchant-suggestions">
                  {merchantSuggestions.map(merchant => (
                    <option key={merchant} value={merchant} />
                  ))}
                </datalist>
              </label>
              <label className="flex flex-col gap-1 text-sm sm:col-span-2">Note
                <input
                  ref={element => { formFieldRefs.current[4] = element; }}
                  className="rounded border border-slate-700 bg-slate-950 px-3 py-2"
                  value={form.note}
                  onChange={e => setForm(prev => ({ ...prev, note: e.target.value }))}
                  onKeyDown={event => handleArrowNavigation(4, event)}
                />
              </label>
              {!editingExpenseId && (
                <label className="sm:col-span-2 flex items-center gap-2 text-sm">
                  <input
                    ref={element => { formFieldRefs.current[5] = element; }}
                    type="checkbox"
                    checked={form.batchMode}
                    onChange={e => setForm(prev => ({ ...prev, batchMode: e.target.checked }))}
                    onKeyDown={event => handleArrowNavigation(5, event)}
                  />
                  Keep form open after save (batch mode)
                </label>
              )}
              <div className="sm:col-span-2 flex gap-3">
                <button
                  ref={element => { formFieldRefs.current[6] = element; }}
                  className="rounded bg-brand-600 px-4 py-2 font-semibold"
                  type="submit"
                  onKeyDown={event => handleArrowNavigation(6, event)}
                >
                  Save
                </button>
                <button className="rounded border border-slate-700 px-4 py-2" type="button" onClick={() => setShowExpenseForm(false)}>Cancel</button>
              </div>
            </form>
          </section>
        )}

        {error && <p className="rounded bg-red-500/20 p-3 text-sm text-red-200">{error}</p>}
        {budgetNotice && <p className="rounded bg-sky-500/20 p-3 text-sm text-sky-200">{budgetNotice}</p>}

        <section className="rounded-2xl bg-slate-900 p-5">
          <h2 className="mb-3 text-xl font-semibold">Category manager</h2>
          <form className="mb-4 flex flex-wrap gap-2" onSubmit={handleAddCategory}>
            <input
              className="min-w-60 flex-1 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              placeholder="Add category name"
              value={newCategoryName}
              onChange={event => setNewCategoryName(event.target.value)}
            />
            <button className="rounded border border-slate-700 px-3 py-2 text-sm" type="submit">Add category</button>
          </form>

          <div className="space-y-2">
            {activeCategories.map((category, index) => (
              <div key={category.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-800 p-3 text-sm">
                <p className="font-medium">
                  {category.name}
                  {category.isDefault ? <span className="ml-2 text-xs text-slate-400">default</span> : null}
                </p>
                <div className="flex items-center gap-2">
                  <button className="rounded border border-slate-700 px-2 py-1 text-xs" onClick={() => moveCategory(category.id, -1)} disabled={index === 0}>
                    Up
                  </button>
                  <button className="rounded border border-slate-700 px-2 py-1 text-xs" onClick={() => moveCategory(category.id, 1)} disabled={index === activeCategories.length - 1}>
                    Down
                  </button>
                  <button className="rounded border border-amber-700 px-2 py-1 text-xs text-amber-300" onClick={() => handleArchiveCategory(category.id)}>
                    Archive
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 text-sm text-slate-400">
            <p className="font-medium text-slate-300">Archived categories</p>
            {categories.filter(category => category.isArchived).length === 0 ? (
              <p>None</p>
            ) : (
              <p>{categories.filter(category => category.isArchived).map(category => category.name).join(', ')}</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl bg-slate-900 p-5">
          <h2 className="mb-3 text-xl font-semibold">Category budgets</h2>
          <div className="space-y-3">
            {activeCategories.map(category => {
              const spent = spentByCategory[category.id] ?? 0;
              const budget = budgets[category.id] ?? 0;
              const delta = budget - spent;

              return (
                <div key={category.id} className="grid gap-2 rounded border border-slate-800 p-3 sm:grid-cols-[2fr,1fr,1fr,auto] sm:items-center">
                  <p className="font-medium">{category.name}</p>
                  <p className="text-sm">Spent: {formatCurrency(spent)}</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-28 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                      placeholder="Budget"
                      value={budgetInputs[category.id] ?? ''}
                      onChange={e => setBudgetInputs(prev => ({ ...prev, [category.id]: e.target.value }))}
                    />
                    <button className="rounded border border-slate-700 px-2 py-1 text-xs" onClick={() => handleBudgetSave(category.id)}>Save</button>
                  </div>
                  <p className={`text-sm font-semibold ${delta >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {delta >= 0 ? 'Remaining' : 'Over'}: {formatCurrency(Math.abs(delta))}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl bg-slate-900 p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Transactions</h2>
            <p className="text-xs text-slate-400">{filteredExpenses.length} shown</p>
          </div>
          <div className="mb-4 grid gap-3 rounded border border-slate-800 p-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="flex flex-col gap-1 text-xs text-slate-300 lg:col-span-2">Search (merchant/note)
              <input
                className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                placeholder="Coffee, Amazon, membership..."
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-300">Category
              <select
                className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                value={categoryFilterId}
                onChange={event => setCategoryFilterId(event.target.value)}
              >
                <option value="">All categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.isArchived ? `${category.name} (archived)` : category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-300">Min ($)
              <input
                type="number"
                min="0"
                step="0.01"
                className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                value={minAmountFilter}
                onChange={event => setMinAmountFilter(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-300">Max ($)
              <input
                type="number"
                min="0"
                step="0.01"
                className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                value={maxAmountFilter}
                onChange={event => setMaxAmountFilter(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-300 lg:col-span-2">Sort
              <select
                className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
                value={sort}
                onChange={event => setSort(event.target.value as TransactionSort)}
              >
                <option value="date-desc">Newest first</option>
                <option value="date-asc">Oldest first</option>
                <option value="amount-desc">Amount: high to low</option>
                <option value="amount-asc">Amount: low to high</option>
                <option value="merchant-asc">Merchant/note A-Z</option>
              </select>
            </label>
          </div>

          <div className="space-y-2">
            {filteredExpenses.length === 0 && <p className="text-sm text-slate-400">No matching expenses for this month.</p>}
            {filteredExpenses.map(expense => {
              const category = categories.find(item => item.id === expense.categoryId);
              return (
                <div key={expense.id} className="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-800 p-3 text-sm">
                  <div>
                    <p className="font-medium">{expense.merchant || expense.note || 'Expense'}</p>
                    <p className="text-slate-400">{expense.date} • {category?.name ?? 'Uncategorized'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{formatCurrency(expense.amountCents)}</p>
                    <button className="rounded border border-slate-700 px-2 py-1 text-xs" onClick={() => handleEdit(expense)}>Edit</button>
                    <button className="rounded border border-rose-700 px-2 py-1 text-xs text-rose-300" onClick={() => handleDelete(expense.id)}>Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
