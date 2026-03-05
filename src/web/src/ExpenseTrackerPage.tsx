import { DragEvent as ReactDragEvent, FormEvent, Fragment, KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  addCategory,
  addSubcategory,
  archiveCategory,
  autoCopyBudgetsFromPreviousMonth,
  Category,
  Expense,
  Subcategory,
  addExpense,
  deleteExpense,
  ensureDefaultSubcategoryAssignments,
  getBudgetsByMonth,
  getCategories,
  getSubcategories,
  getExpensesByMonth,
  getLastUsedCategory,
  getRecentMerchants,
  saveCategories,
  seedDefaultCategories,
  seedDefaultSubcategories,
  setLastUsedCategory,
  unarchiveCategory,
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
type CategoryDropPlacement = 'before' | 'after';
type BudgetSort = 'custom' | 'alpha-asc' | 'alpha-desc' | 'budget-desc' | 'spent-desc' | 'remaining-desc';

const DEFAULT_SUBCATEGORY_ORDER = ['Bills', 'Savings', 'Debts', 'Subscriptions', 'Variable Spending'];

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
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [merchantSuggestions, setMerchantSuggestions] = useState<string[]>([]);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [budgetInputs, setBudgetInputs] = useState<Record<string, string>>({});
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySubcategoryId, setNewCategorySubcategoryId] = useState('');
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [showNoSubcategoryWarning, setShowNoSubcategoryWarning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilterId, setCategoryFilterId] = useState('');
  const [minAmountFilter, setMinAmountFilter] = useState('');
  const [maxAmountFilter, setMaxAmountFilter] = useState('');
  const [sort, setSort] = useState<TransactionSort>('date-desc');
  const [budgetSort, setBudgetSort] = useState<BudgetSort>('alpha-asc');
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [budgetNotice, setBudgetNotice] = useState<string | null>(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [isTransactionsCollapsed, setIsTransactionsCollapsed] = useState(false);
  const [isBudgetsCollapsed, setIsBudgetsCollapsed] = useState(false);
  const [isCategoryManagerCollapsed, setIsCategoryManagerCollapsed] = useState(false);
  const [collapsedBudgetGroups, setCollapsedBudgetGroups] = useState<Record<string, boolean>>({});
  const [budgetSaveStatus, setBudgetSaveStatus] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({});
  const [form, setForm] = useState<ExpenseFormState>({
    amount: '',
    date: dateString(today),
    categoryId: '',
    merchant: '',
    note: '',
    batchMode: false
  });

  const formFieldRefs = useRef<Array<HTMLElement | null>>([]);
  const [draggingBudgetItemId, setDraggingBudgetItemId] = useState<string | null>(null);
  const [dragOverBudgetItem, setDragOverBudgetItem] = useState<{ id: string; placement: CategoryDropPlacement } | null>(null);
  const [dragOverSubcategoryId, setDragOverSubcategoryId] = useState<string | null | undefined>(undefined);
  const budgetStatusTimeouts = useRef<Record<string, number>>({});

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
    const [nextCategories, nextSubcategories, monthExpenses, monthBudgets, recentMerchants] = await Promise.all([
      getCategories(),
      getSubcategories(),
      getExpensesByMonth(month),
      getBudgetsByMonth(month),
      getRecentMerchants(10)
    ]);

    const budgetMap = monthBudgets.reduce<Record<string, number>>((acc, budget) => {
      acc[budget.categoryId] = budget.amountCents;
      return acc;
    }, {});

    setCategories(nextCategories);
    setSubcategories(nextSubcategories);
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
      await seedDefaultSubcategories();
      await seedDefaultCategories();
      await ensureDefaultSubcategoryAssignments();
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

  useEffect(() => {
    return () => {
      Object.values(budgetStatusTimeouts.current).forEach(timeoutId => window.clearTimeout(timeoutId));
    };
  }, []);

  const totalSpent = useMemo(() => expenses.reduce((sum, expense) => sum + expense.amountCents, 0), [expenses]);

  const spentByCategory = useMemo(() => {
    return expenses.reduce<Record<string, number>>((acc, expense) => {
      acc[expense.categoryId] = (acc[expense.categoryId] ?? 0) + expense.amountCents;
      return acc;
    }, {});
  }, [expenses]);

  const orderedSubcategories = useMemo(() => {
    const defaultSubcategories = DEFAULT_SUBCATEGORY_ORDER
      .map(name => subcategories.find(subcategory => subcategory.name === name))
      .filter((subcategory): subcategory is Subcategory => Boolean(subcategory));
    const defaultIds = new Set(defaultSubcategories.map(subcategory => subcategory.id));
    const customSubcategories = subcategories
      .filter(subcategory => !defaultIds.has(subcategory.id))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

    return [...defaultSubcategories, ...customSubcategories];
  }, [subcategories]);

  const groupedBudgetItems = useMemo(() => {
    const sortItems = (items: Category[]) => {
      const sorted = [...items];

      if (budgetSort === 'custom') {
        sorted.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
        return sorted;
      }

      sorted.sort((a, b) => {
        if (budgetSort === 'alpha-asc') {
          return a.name.localeCompare(b.name);
        }
        if (budgetSort === 'alpha-desc') {
          return b.name.localeCompare(a.name);
        }

        const aBudget = budgets[a.id] ?? 0;
        const bBudget = budgets[b.id] ?? 0;
        const aSpent = spentByCategory[a.id] ?? 0;
        const bSpent = spentByCategory[b.id] ?? 0;
        const aRemaining = aBudget - aSpent;
        const bRemaining = bBudget - bSpent;

        if (budgetSort === 'budget-desc') {
          return bBudget - aBudget || a.name.localeCompare(b.name);
        }
        if (budgetSort === 'spent-desc') {
          return bSpent - aSpent || a.name.localeCompare(b.name);
        }
        return bRemaining - aRemaining || a.name.localeCompare(b.name);
      });

      return sorted;
    };

    const groups: Array<{
      id: string | null;
      name: string;
      items: Category[];
      isUncategorized: boolean;
      totals: { budget: number; spent: number; remaining: number };
    }> = [];
    const groupMap = new Map<string | null, Category[]>();
    orderedSubcategories.forEach(subcategory => {
      const bucket: Category[] = [];
      groupMap.set(subcategory.id, bucket);
      groups.push({
        id: subcategory.id,
        name: subcategory.name,
        items: bucket,
        isUncategorized: false,
        totals: { budget: 0, spent: 0, remaining: 0 }
      });
    });

    const uncategorized: Category[] = [];
    groupMap.set(null, uncategorized);

    activeCategories.forEach(category => {
      const key = category.subcategoryId ?? null;
      const bucket = groupMap.get(key);
      if (bucket) {
        bucket.push(category);
      } else {
        uncategorized.push(category);
      }
    });

    groups.forEach(group => {
      group.items = sortItems(group.items);
      const totals = group.items.reduce(
        (acc, item) => {
          const budget = budgets[item.id] ?? 0;
          const spent = spentByCategory[item.id] ?? 0;
          acc.budget += budget;
          acc.spent += spent;
          acc.remaining += budget - spent;
          return acc;
        },
        { budget: 0, spent: 0, remaining: 0 }
      );
      group.totals = totals;
    });

    const uncategorizedTotals = uncategorized.reduce(
      (acc, item) => {
        const budget = budgets[item.id] ?? 0;
        const spent = spentByCategory[item.id] ?? 0;
        acc.budget += budget;
        acc.spent += spent;
        acc.remaining += budget - spent;
        return acc;
      },
      { budget: 0, spent: 0, remaining: 0 }
    );

    groups.push({
      id: null,
      name: 'Uncategorized',
      items: sortItems(uncategorized),
      isUncategorized: true,
      totals: uncategorizedTotals
    });

    return groups;
  }, [activeCategories, budgetSort, budgets, orderedSubcategories, spentByCategory]);

  const getBudgetGroupKey = (groupId: string | null) => groupId ?? 'uncategorized';

  const sortedManagerCategories = useMemo(() => {
    return [...activeCategories].sort((a, b) => a.name.localeCompare(b.name));
  }, [activeCategories]);

  const archivedManagerCategories = useMemo(() => {
    return categories.filter(category => category.isArchived).sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  const budgetTotals = useMemo(() => {
    return activeCategories.reduce(
      (acc, category) => {
        acc.spent += spentByCategory[category.id] ?? 0;
        acc.budget += budgets[category.id] ?? 0;
        return acc;
      },
      { spent: 0, budget: 0 }
    );
  }, [activeCategories, budgets, spentByCategory]);

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

  const groupedExpensesByMerchant = useMemo(() => {
    const order: Array<{ key: string; label: string; items: Expense[] }> = [];
    const map = new Map<string, { label: string; items: Expense[] }>();

    filteredExpenses.forEach(expense => {
      const merchantLabel = (expense.merchant ?? '').trim() || 'Unknown merchant';
      const key = merchantLabel.toLowerCase();
      const existing = map.get(key);

      if (!existing) {
        const bucket = { label: merchantLabel, items: [expense] };
        map.set(key, bucket);
        order.push({ key, label: merchantLabel, items: bucket.items });
        return;
      }

      existing.items.push(expense);
    });

    return order;
  }, [filteredExpenses]);

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

  const moveBudgetItemByDrag = async (targetCategoryId: string, placement: CategoryDropPlacement) => {
    try {
      if (budgetSort !== 'custom' || !draggingBudgetItemId || draggingBudgetItemId === targetCategoryId) {
        return;
      }

      const dragged = activeCategories.find(category => category.id === draggingBudgetItemId);
      const target = activeCategories.find(category => category.id === targetCategoryId);
      if (!dragged || !target) {
        return;
      }

      const sourceKey = dragged.subcategoryId ?? null;
      const targetKey = target.subcategoryId ?? null;
      const groupMap = new Map<string | null, Category[]>();

      activeCategories.forEach(category => {
        const key = category.subcategoryId ?? null;
        const bucket = groupMap.get(key);
        if (bucket) {
          bucket.push(category);
        } else {
          groupMap.set(key, [category]);
        }
      });

      const sourceGroup = groupMap.get(sourceKey) ?? [];
      const targetGroup = sourceKey === targetKey ? sourceGroup : groupMap.get(targetKey) ?? [];
      const filteredTarget = targetGroup.filter(item => item.id !== dragged.id);
      const targetIndex = filteredTarget.findIndex(item => item.id === target.id);
      if (targetIndex < 0) {
        return;
      }

      const insertionIndex = placement === 'after' ? targetIndex + 1 : targetIndex;
      const nextTargetGroup = [...filteredTarget];
      nextTargetGroup.splice(insertionIndex, 0, { ...dragged, subcategoryId: targetKey });

      const nextSourceGroup = sourceKey === targetKey ? nextTargetGroup : sourceGroup.filter(item => item.id !== dragged.id);
      const updates = new Map<string, Category>();

      nextTargetGroup.forEach((item, index) => {
        updates.set(item.id, { ...item, subcategoryId: targetKey, sortOrder: index });
      });

      if (sourceKey !== targetKey) {
        nextSourceGroup.forEach((item, index) => {
          updates.set(item.id, { ...item, subcategoryId: sourceKey, sortOrder: index });
        });
      }

      const nextCategories = categories.map(category => updates.get(category.id) ?? category);
      await saveCategories(nextCategories);
      await loadData(selectedMonth);
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to reorder budget items.');
    } finally {
      setDraggingBudgetItemId(null);
      setDragOverBudgetItem(null);
      setDragOverSubcategoryId(undefined);
    }
  };

  const moveBudgetItemToSubcategory = async (targetSubcategoryId: string | null) => {
    try {
      if (budgetSort !== 'custom' || !draggingBudgetItemId) {
        return;
      }

      const dragged = activeCategories.find(category => category.id === draggingBudgetItemId);
      if (!dragged) {
        return;
      }

      const sourceKey = dragged.subcategoryId ?? null;
      const targetKey = targetSubcategoryId ?? null;
      const sourceGroup = activeCategories.filter(category => (category.subcategoryId ?? null) === sourceKey && category.id !== dragged.id);
      const targetGroup = activeCategories.filter(category => (category.subcategoryId ?? null) === targetKey && category.id !== dragged.id);
      const nextTargetGroup = [...targetGroup, { ...dragged, subcategoryId: targetKey }];
      const updates = new Map<string, Category>();

      nextTargetGroup.forEach((item, index) => {
        updates.set(item.id, { ...item, subcategoryId: targetKey, sortOrder: index });
      });

      if (sourceKey !== targetKey) {
        sourceGroup.forEach((item, index) => {
          updates.set(item.id, { ...item, subcategoryId: sourceKey, sortOrder: index });
        });
      }

      const nextCategories = categories.map(category => updates.get(category.id) ?? category);
      await saveCategories(nextCategories);
      await loadData(selectedMonth);
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to move budget items.');
    } finally {
      setDraggingBudgetItemId(null);
      setDragOverBudgetItem(null);
      setDragOverSubcategoryId(undefined);
    }
  };

  const handleBudgetItemDragStart = (event: ReactDragEvent<HTMLDivElement>, categoryId: string) => {
    if (budgetSort !== 'custom') {
      return;
    }
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', categoryId);
    setDraggingBudgetItemId(categoryId);
    setDragOverBudgetItem(null);
    setDragOverSubcategoryId(undefined);
  };

  const handleBudgetItemDragOver = (event: ReactDragEvent<HTMLDivElement>, categoryId: string) => {
    if (budgetSort !== 'custom' || !draggingBudgetItemId || draggingBudgetItemId === categoryId) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const rect = event.currentTarget.getBoundingClientRect();
    const placement: CategoryDropPlacement = event.clientY >= rect.top + rect.height / 2 ? 'after' : 'before';

    setDragOverBudgetItem(current => {
      if (current?.id === categoryId && current.placement === placement) {
        return current;
      }

      return { id: categoryId, placement };
    });
    setDragOverSubcategoryId(undefined);
  };

  const handleBudgetItemDrop = async (event: ReactDragEvent<HTMLDivElement>, categoryId: string) => {
    if (budgetSort !== 'custom') {
      return;
    }
    event.preventDefault();
    const placement = dragOverBudgetItem?.id === categoryId ? dragOverBudgetItem.placement : 'before';
    await moveBudgetItemByDrag(categoryId, placement);
  };

  const handleBudgetGroupDragOver = (event: ReactDragEvent<HTMLDivElement>, subcategoryId: string | null) => {
    if (budgetSort !== 'custom' || !draggingBudgetItemId) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverSubcategoryId(subcategoryId);
    setDragOverBudgetItem(null);
  };

  const handleBudgetGroupDrop = async (event: ReactDragEvent<HTMLDivElement>, subcategoryId: string | null) => {
    if (budgetSort !== 'custom') {
      return;
    }
    event.preventDefault();
    await moveBudgetItemToSubcategory(subcategoryId);
  };

  const handleBudgetDragEnd = () => {
    setDraggingBudgetItemId(null);
    setDragOverBudgetItem(null);
    setDragOverSubcategoryId(undefined);
  };

  const submitNewCategory = async (subcategoryId: string | null) => {
    await addCategory(newCategoryName, subcategoryId);
    setNewCategoryName('');
    setNewCategorySubcategoryId('');
    setShowNoSubcategoryWarning(false);
    await loadData(selectedMonth);
  };

  const handleAddCategory = async (event: FormEvent) => {
    event.preventDefault();

    if (!newCategoryName.trim()) {
      setError('Item name is required.');
      return;
    }

    if (!newCategorySubcategoryId) {
      setShowNoSubcategoryWarning(true);
      setError(null);
      return;
    }

    try {
      await submitNewCategory(newCategorySubcategoryId);
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to add item.');
    }
  };

  const handleAddWithoutSubcategory = async () => {
    try {
      await submitNewCategory(null);
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to add item.');
    }
  };

  const handleAddSubcategory = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const created = await addSubcategory(newSubcategoryName);
      setNewSubcategoryName('');
      setNewCategorySubcategoryId(created.id);
      await loadData(selectedMonth);
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to add subcategory.');
    }
  };

  const handleArchiveCategory = async (categoryId: string) => {
    try {
      await archiveCategory(categoryId);
      await loadData(selectedMonth);
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to archive item.');
    }
  };

  const handleUnarchiveCategory = async (categoryId: string) => {
    try {
      await unarchiveCategory(categoryId);
      await loadData(selectedMonth);
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to unarchive item.');
    }
  };

  const handleBudgetAutoSave = async (categoryId: string) => {
    try {
      const rawValue = budgetInputs[categoryId] ?? '';
      const amount = Number(rawValue);
      if (!Number.isFinite(amount) || amount < 0) {
        setBudgetSaveStatus(prev => ({ ...prev, [categoryId]: 'error' }));
        return;
      }

      const amountCents = Math.round(amount * 100);
      const current = budgets[categoryId] ?? 0;
      if (amountCents === current) {
        setBudgetSaveStatus(prev => ({ ...prev, [categoryId]: 'idle' }));
        return;
      }

      setBudgetSaveStatus(prev => ({ ...prev, [categoryId]: 'saving' }));
      await upsertBudget(selectedMonth, categoryId, amountCents);
      setBudgets(prev => ({ ...prev, [categoryId]: amountCents }));
      setBudgetSaveStatus(prev => ({ ...prev, [categoryId]: 'saved' }));
      if (budgetStatusTimeouts.current[categoryId]) {
        window.clearTimeout(budgetStatusTimeouts.current[categoryId]);
      }
      budgetStatusTimeouts.current[categoryId] = window.setTimeout(() => {
        setBudgetSaveStatus(prev => ({ ...prev, [categoryId]: 'idle' }));
      }, 1500);
    } catch (caughtError) {
      setBudgetSaveStatus(prev => ({ ...prev, [categoryId]: 'error' }));
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
          <button
            type="button"
            className="mb-3 flex w-full items-center justify-between text-left"
            onClick={() => setIsTransactionsCollapsed(prev => !prev)}
            aria-expanded={!isTransactionsCollapsed}
          >
            <h2 className="text-xl font-semibold">Transactions</h2>
            <span className="text-xs text-slate-400">{isTransactionsCollapsed ? 'Expand' : 'Collapse'}</span>
          </button>

          {isTransactionsCollapsed ? (
            latestExpense ? (
              <div className="rounded border border-slate-800 p-3 text-sm">
                <p className="text-xs uppercase tracking-wide text-slate-400">Last transaction entered</p>
                <p className="mt-1 font-medium">{latestExpense.merchant || latestExpense.note || 'Expense'}</p>
                <p className="text-slate-400">
                  {latestExpense.date} • {categories.find(item => item.id === latestExpense.categoryId)?.name ?? 'Uncategorized'}
                </p>
                <p className="mt-1 font-semibold">{formatCurrency(latestExpense.amountCents)}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No transactions yet for this month.</p>
            )
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
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

              <div className="space-y-4">
                {groupedExpensesByMerchant.length === 0 && (
                  <p className="text-sm text-slate-400">No matching expenses for this month.</p>
                )}
                {groupedExpensesByMerchant.map(group => (
                  <div key={group.key} className="space-y-2">
                    <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                      <p>{group.label}</p>
                      <p>{group.items.length} transaction{group.items.length === 1 ? '' : 's'}</p>
                    </div>
                    {group.items.map(expense => {
                      const category = categories.find(item => item.id === expense.categoryId);
                      return (
                        <div key={expense.id} className="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-800 p-3 text-sm">
                          <div>
                            <p className="font-medium">{expense.note || expense.merchant || 'Expense'}</p>
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
                ))}
              </div>
            </>
          )}
        </section>

        <section className="rounded-2xl bg-slate-900 p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              className="flex items-center gap-3 text-left"
              onClick={() => setIsBudgetsCollapsed(prev => !prev)}
              aria-expanded={!isBudgetsCollapsed}
            >
              <h2 className="text-xl font-semibold">Budget items</h2>
              <span className="text-xs text-slate-400">{isBudgetsCollapsed ? 'Expand' : 'Collapse'}</span>
            </button>
            {!isBudgetsCollapsed && (
              <label className="flex items-center gap-2 text-xs text-slate-400">
                Sort
                <select
                  className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200"
                  value={budgetSort}
                  onChange={event => setBudgetSort(event.target.value as BudgetSort)}
                >
                  <option value="custom">Custom order</option>
                  <option value="alpha-asc">A → Z</option>
                  <option value="alpha-desc">Z → A</option>
                  <option value="budget-desc">Highest budget</option>
                  <option value="spent-desc">Highest spent</option>
                  <option value="remaining-desc">Highest remaining</option>
                </select>
              </label>
            )}
          </div>
          {!isBudgetsCollapsed && (
            <div className="rounded border border-slate-800">
              <div className="hidden items-center gap-x-3 border-b border-slate-800 px-3 py-2 text-xs uppercase tracking-wide text-slate-400 sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,10ch)]">
                <div>Item</div>
                <div className="justify-self-end text-right">Budget</div>
                <div className="justify-self-end text-right">Spent</div>
                <div className="justify-self-end text-right">Remaining</div>
                <div className="justify-self-end text-right">Status</div>
              </div>
              <div className="divide-y divide-slate-800">
                {groupedBudgetItems.map(group => {
                  const groupKey = getBudgetGroupKey(group.id);
                  const isCollapsed = collapsedBudgetGroups[groupKey] ?? false;

                  return (
                    <Fragment key={`budget-group-${group.id ?? 'uncategorized'}`}>
                      <div
                        className={`px-3 py-2 text-xs uppercase tracking-wide ${
                          dragOverSubcategoryId === group.id ? 'bg-slate-800/60 text-slate-200' : 'bg-slate-950/40 text-slate-400'
                        }`}
                        onDragOver={event => handleBudgetGroupDragOver(event, group.id)}
                        onDrop={event => handleBudgetGroupDrop(event, group.id)}
                      >
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            className="flex items-center gap-2 text-left font-semibold uppercase tracking-wide"
                            onClick={() => setCollapsedBudgetGroups(prev => ({ ...prev, [groupKey]: !isCollapsed }))}
                          >
                            {group.name}
                            <span className="text-[10px] text-slate-500">{isCollapsed ? 'Expand' : 'Collapse'}</span>
                          </button>
                          {budgetSort === 'custom' && !isCollapsed && (
                            <span className="text-[10px] text-slate-500">Drag items here to move</span>
                          )}
                        </div>
                      </div>
                      {!isCollapsed && (group.items.length === 0 ? (
                        <div
                          className={`px-3 py-2 text-sm text-slate-500 ${
                            dragOverSubcategoryId === group.id ? 'bg-slate-800/40' : ''
                          }`}
                          onDragOver={event => handleBudgetGroupDragOver(event, group.id)}
                          onDrop={event => handleBudgetGroupDrop(event, group.id)}
                        >
                          No items yet.
                        </div>
                      ) : (
                        group.items.map(category => {
                          const spent = spentByCategory[category.id] ?? 0;
                          const budget = budgets[category.id] ?? 0;
                          const delta = budget - spent;
                          const status = budgetSaveStatus[category.id] ?? 'idle';
                          const statusLabel = status === 'saving'
                            ? 'Saving...'
                            : status === 'saved'
                              ? 'Saved'
                              : status === 'error'
                                ? 'Error'
                                : '';
                          const isDragging = draggingBudgetItemId === category.id;
                          const dragIndicator = dragOverBudgetItem?.id === category.id
                            ? dragOverBudgetItem.placement === 'before'
                              ? 'border-t-2 border-brand-500'
                              : 'border-b-2 border-brand-500'
                            : '';

                          return (
                            <div
                              key={category.id}
                              className={`grid grid-cols-2 gap-x-3 gap-y-1 px-3 py-2 text-sm sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,10ch)] ${
                                budgetSort === 'custom' ? 'cursor-move' : ''
                              } ${isDragging ? 'opacity-60' : ''} ${dragIndicator}`}
                              draggable={budgetSort === 'custom'}
                              onDragStart={event => handleBudgetItemDragStart(event, category.id)}
                              onDragOver={event => handleBudgetItemDragOver(event, category.id)}
                              onDrop={event => handleBudgetItemDrop(event, category.id)}
                              onDragEnd={handleBudgetDragEnd}
                            >
                              <div className="order-1 font-medium sm:order-none">{category.name}</div>
                              <div className="order-4 justify-self-stretch sm:order-none">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  inputMode="decimal"
                                  className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-right text-sm tabular-nums"
                                  value={budgetInputs[category.id] ?? ''}
                                  onChange={e => setBudgetInputs(prev => ({ ...prev, [category.id]: e.target.value }))}
                                  onBlur={() => void handleBudgetAutoSave(category.id)}
                                  onKeyDown={event => {
                                    if (event.key === 'Enter') {
                                      event.preventDefault();
                                      event.currentTarget.blur();
                                    }
                                  }}
                                  aria-label={`Budget for ${category.name}`}
                                />
                              </div>
                              <div className="order-3 justify-self-end text-right tabular-nums text-slate-300 sm:order-none">{formatCurrency(spent)}</div>
                              <div
                                className={`order-2 justify-self-end text-right font-semibold tabular-nums sm:order-none ${
                                  delta >= 0 ? 'text-emerald-300' : 'text-rose-300'
                                }`}
                              >
                                {formatCurrency(delta)}
                              </div>
                              <div
                                className={`order-5 col-span-2 justify-self-end text-right text-xs sm:col-span-1 sm:order-none ${
                                  status === 'error' ? 'text-rose-300' : status === 'saved' ? 'text-emerald-300' : 'text-slate-400'
                                }`}
                              >
                                {statusLabel}
                              </div>
                            </div>
                          );
                        })
                      ))}
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 bg-slate-950/60 px-3 py-2 text-xs sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,10ch)]">
                        <div className="order-1 font-semibold text-slate-300 sm:order-none">Subtotal</div>
                        <div className="order-4 justify-self-end text-right font-semibold tabular-nums text-slate-300 sm:order-none">
                          {formatCurrency(group.totals.budget)}
                        </div>
                        <div className="order-3 justify-self-end text-right font-semibold tabular-nums text-slate-300 sm:order-none">
                          {formatCurrency(group.totals.spent)}
                        </div>
                        <div className="order-2 justify-self-end text-right font-semibold tabular-nums text-slate-300 sm:order-none">
                          {formatCurrency(group.totals.remaining)}
                        </div>
                        <div className="order-5 col-span-2 justify-self-end text-right text-xs leading-tight text-slate-500 sm:col-span-1 sm:order-none sm:break-words sm:whitespace-normal">
                          {group.name}
                        </div>
                      </div>
                    </Fragment>
                  );
                })}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 bg-slate-950/40 px-3 py-2 text-sm sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,10ch)]">
                  <div className="order-1 font-semibold text-slate-200 sm:order-none">Total</div>
                  <div className="order-4 justify-self-end text-right font-semibold tabular-nums text-slate-200 sm:order-none">
                    {formatCurrency(budgetTotals.budget)}
                  </div>
                  <div className="order-3 justify-self-end text-right font-semibold tabular-nums text-slate-200 sm:order-none">
                    {formatCurrency(budgetTotals.spent)}
                  </div>
                  <div className="order-2 justify-self-end text-right text-slate-500 sm:order-none">—</div>
                  <div className="order-5 col-span-2 justify-self-end text-right text-xs text-slate-500 sm:col-span-1 sm:order-none">Totals</div>
                </div>
              </div>
            </div>
          )}
          {isBudgetsCollapsed && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Total budget</span>
                <span className="font-semibold tabular-nums text-slate-200">{formatCurrency(budgetTotals.budget)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Total spent</span>
                <span className="font-semibold tabular-nums text-slate-200">{formatCurrency(budgetTotals.spent)}</span>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-slate-900 p-5">
          <button
            type="button"
            className="mb-3 flex w-full items-center justify-between text-left"
            onClick={() => setIsCategoryManagerCollapsed(prev => !prev)}
            aria-expanded={!isCategoryManagerCollapsed}
          >
            <h2 className="text-xl font-semibold">Budget items manager</h2>
            <span className="text-xs text-slate-400">{isCategoryManagerCollapsed ? 'Expand' : 'Collapse'}</span>
          </button>
          {!isCategoryManagerCollapsed && (
            <>
              <form className="mb-3 grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" onSubmit={handleAddCategory}>
                <label className="flex flex-col gap-1 text-sm sm:col-span-2">Item name
                  <input
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                    placeholder="Add item name"
                    value={newCategoryName}
                    onChange={event => setNewCategoryName(event.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">Subcategory
                  <select
                    className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                    value={newCategorySubcategoryId}
                    onChange={event => {
                      setNewCategorySubcategoryId(event.target.value);
                      setShowNoSubcategoryWarning(false);
                    }}
                  >
                    <option value="">No subcategory</option>
                    {subcategories.map(subcategory => (
                      <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
                    ))}
                  </select>
                </label>
                <button className="rounded border border-slate-700 px-3 py-2 text-sm sm:self-end" type="submit">
                  Add item
                </button>
              </form>

              {showNoSubcategoryWarning && (
                <div className="mb-4 rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
                  <p className="font-medium">No subcategory selected. Add item without one?</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button className="rounded bg-amber-500/20 px-3 py-1 text-xs text-amber-100" type="button" onClick={handleAddWithoutSubcategory}>
                      Add anyway
                    </button>
                    <button className="rounded border border-amber-500/40 px-3 py-1 text-xs" type="button" onClick={() => setShowNoSubcategoryWarning(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <form className="mb-4 flex flex-wrap gap-2" onSubmit={handleAddSubcategory}>
                <input
                  className="min-w-60 flex-1 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  placeholder="New subcategory name"
                  value={newSubcategoryName}
                  onChange={event => setNewSubcategoryName(event.target.value)}
                />
                <button className="rounded border border-slate-700 px-3 py-2 text-sm" type="submit">Add subcategory</button>
              </form>

              <div className="space-y-2">
                {sortedManagerCategories.map(category => (
                  <div
                    key={category.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-800 p-3 text-sm"
                  >
                    <p className="font-medium">
                      {category.name}
                      {category.isDefault ? <span className="ml-2 text-xs text-slate-400">default</span> : null}
                    </p>
                    <div className="flex items-center gap-2">
                      <button className="rounded border border-amber-700 px-2 py-1 text-xs text-amber-300" onClick={() => handleArchiveCategory(category.id)}>
                        Archive
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-sm text-slate-400">
                <p className="font-medium text-slate-300">Archived items</p>
                {archivedManagerCategories.length === 0 ? (
                  <p>None</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {archivedManagerCategories.map(category => (
                      <div
                        key={category.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-800 p-3 text-sm"
                      >
                        <p className="font-medium text-slate-200">{category.name}</p>
                        <button
                          className="rounded border border-emerald-700 px-2 py-1 text-xs text-emerald-300"
                          onClick={() => handleUnarchiveCategory(category.id)}
                        >
                          Unarchive
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
