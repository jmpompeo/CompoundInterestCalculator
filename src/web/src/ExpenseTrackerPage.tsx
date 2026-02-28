import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Category,
  Expense,
  addExpense,
  deleteExpense,
  getBudgetsByMonth,
  getCategories,
  getExpensesByMonth,
  getLastUsedCategory,
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

const today = new Date();
const monthString = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const dateString = (date: Date): string => `${monthString(date)}-${String(date.getDate()).padStart(2, '0')}`;
const formatCurrency = (cents: number): string => (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' });

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
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [budgetInputs, setBudgetInputs] = useState<Record<string, string>>({});
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [form, setForm] = useState<ExpenseFormState>({
    amount: '',
    date: dateString(today),
    categoryId: '',
    merchant: '',
    note: '',
    batchMode: false
  });

  const loadData = async (month: string) => {
    const [nextCategories, monthExpenses, monthBudgets] = await Promise.all([
      getCategories(),
      getExpensesByMonth(month),
      getBudgetsByMonth(month)
    ]);

    const budgetMap = monthBudgets.reduce<Record<string, number>>((acc, budget) => {
      acc[budget.categoryId] = budget.amountCents;
      return acc;
    }, {});

    setCategories(nextCategories.filter(c => !c.isArchived));
    setExpenses(monthExpenses);
    setBudgets(budgetMap);
    setBudgetInputs(
      nextCategories.reduce<Record<string, string>>((acc, category) => {
        acc[category.id] = budgetMap[category.id] ? String(budgetMap[category.id] / 100) : '';
        return acc;
      }, {})
    );

    setForm(prev => {
      const lastUsed = getLastUsedCategory();
      const defaultCategory = lastUsed && nextCategories.some(c => c.id === lastUsed) ? lastUsed : nextCategories[0]?.id ?? '';
      return {
        ...prev,
        categoryId: prev.categoryId || defaultCategory,
        date: prev.date || dateString(today)
      };
    });
  };

  useEffect(() => {
    const init = async () => {
      await seedDefaultCategories();
      await loadData(selectedMonth);
    };

    init().catch(() => setError('Unable to load your local expense data.'));
  }, []);

  useEffect(() => {
    loadData(selectedMonth).catch(() => setError('Unable to refresh month data.'));
  }, [selectedMonth]);

  const totalSpent = useMemo(() => expenses.reduce((sum, expense) => sum + expense.amountCents, 0), [expenses]);

  const spentByCategory = useMemo(() => {
    return expenses.reduce<Record<string, number>>((acc, expense) => {
      acc[expense.categoryId] = (acc[expense.categoryId] ?? 0) + expense.amountCents;
      return acc;
    }, {});
  }, [expenses]);

  const recentExpenses = expenses.slice(0, 15);

  const monthLabel = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }, [selectedMonth]);

  const changeMonth = (offset: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const next = new Date(year, month - 1 + offset, 1);
    setSelectedMonth(monthString(next));
  };

  const startAddExpense = () => {
    setEditingExpenseId(null);
    setShowExpenseForm(true);
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

  const handleBudgetSave = async (categoryId: string) => {
    const amount = Number(budgetInputs[categoryId] ?? '0');
    if (!Number.isFinite(amount) || amount < 0) {
      setError('Budget must be zero or a positive value.');
      return;
    }

    const amountCents = Math.round(amount * 100);
    await upsertBudget(selectedMonth, categoryId, amountCents);
    setBudgets(prev => ({ ...prev, [categoryId]: amountCents }));
    setError(null);
  };

  const handleDelete = async (id: string) => {
    await deleteExpense(id);
    await loadData(selectedMonth);
  };

  const resetFormForBatch = () => {
    setForm(prev => ({
      ...prev,
      amount: '',
      merchant: '',
      note: ''
    }));
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
            <button className="rounded bg-brand-600 px-4 py-2 font-semibold" onClick={startAddExpense}>
              Add Expense
            </button>
          </div>
          <p className="text-sm text-slate-300">Total spent this month: <span className="font-semibold text-white">{formatCurrency(totalSpent)}</span></p>
        </section>

        {showExpenseForm && (
          <section className="rounded-2xl bg-slate-900 p-5">
            <h2 className="mb-3 text-xl font-semibold">{editingExpenseId ? 'Edit Expense' : 'Add Expense'}</h2>
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleSubmitExpense}>
              <label className="flex flex-col gap-1 text-sm">Amount ($)
                <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2" value={form.amount} onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))} required />
              </label>
              <label className="flex flex-col gap-1 text-sm">Date
                <input type="date" className="rounded border border-slate-700 bg-slate-950 px-3 py-2" value={form.date} onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))} required />
              </label>
              <label className="flex flex-col gap-1 text-sm">Category
                <select className="rounded border border-slate-700 bg-slate-950 px-3 py-2" value={form.categoryId} onChange={e => setForm(prev => ({ ...prev, categoryId: e.target.value }))} required>
                  <option value="">Select category</option>
                  {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">Merchant
                <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2" value={form.merchant} onChange={e => setForm(prev => ({ ...prev, merchant: e.target.value }))} />
              </label>
              <label className="flex flex-col gap-1 text-sm sm:col-span-2">Note
                <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2" value={form.note} onChange={e => setForm(prev => ({ ...prev, note: e.target.value }))} />
              </label>
              {!editingExpenseId && (
                <label className="sm:col-span-2 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.batchMode} onChange={e => setForm(prev => ({ ...prev, batchMode: e.target.checked }))} />
                  Keep form open after save (batch mode)
                </label>
              )}
              <div className="sm:col-span-2 flex gap-3">
                <button className="rounded bg-brand-600 px-4 py-2 font-semibold" type="submit">Save</button>
                <button className="rounded border border-slate-700 px-4 py-2" type="button" onClick={() => setShowExpenseForm(false)}>Cancel</button>
              </div>
            </form>
          </section>
        )}

        {error && <p className="rounded bg-red-500/20 p-3 text-sm text-red-200">{error}</p>}

        <section className="rounded-2xl bg-slate-900 p-5">
          <h2 className="mb-3 text-xl font-semibold">Category budgets</h2>
          <div className="space-y-3">
            {categories.map(category => {
              const spent = spentByCategory[category.id] ?? 0;
              const budget = budgets[category.id] ?? 0;
              const delta = budget - spent;

              return (
                <div key={category.id} className="grid gap-2 rounded border border-slate-800 p-3 sm:grid-cols-[2fr,1fr,1fr,auto] sm:items-center">
                  <p className="font-medium">{category.name}</p>
                  <p className="text-sm">Spent: {formatCurrency(spent)}</p>
                  <div className="flex items-center gap-2">
                    <input
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
          <h2 className="mb-3 text-xl font-semibold">Recent expenses</h2>
          <div className="space-y-2">
            {recentExpenses.length === 0 && <p className="text-sm text-slate-400">No expenses yet for this month.</p>}
            {recentExpenses.map(expense => {
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
