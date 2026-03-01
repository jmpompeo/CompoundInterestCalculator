export type Category = {
  id: string;
  name: string;
  subcategoryId?: string | null;
  isDefault: boolean;
  isArchived: boolean;
  sortOrder: number;
};

export type Subcategory = {
  id: string;
  name: string;
  sortOrder: number;
};

export type Budget = {
  id: string;
  month: string;
  categoryId: string;
  amountCents: number;
};

export type Expense = {
  id: string;
  date: string;
  amountCents: number;
  categoryId: string;
  merchant?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

const DB_NAME = 'expense-tracker-db';
const DB_VERSION = 2;
const LAST_CATEGORY_KEY = 'expense-tracker-last-category';

const DEFAULT_SUBCATEGORY_NAMES = ['Bills', 'Savings', 'Debts', 'Subscriptions', 'Variable Spending'];

const DEFAULT_CATEGORY_SUBCATEGORY_MAP: Record<string, string> = {
  Rent: 'Bills',
  Gas: 'Bills',
  Utilities: 'Bills',
  Insurance: 'Bills',
  Healthcare: 'Bills',
  Subscriptions: 'Subscriptions',
  Groceries: 'Variable Spending',
  'Dining Out': 'Variable Spending',
  Entertainment: 'Variable Spending'
};

const DEFAULT_CATEGORY_NAMES = [
  'Groceries',
  'Utilities',
  'Subscriptions',
  'Dining Out',
  'Gas',
  'Rent',
  'Insurance',
  'Healthcare',
  'Entertainment'
];

const openDb = async (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains('subcategories')) {
        db.createObjectStore('subcategories', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('budgets')) {
        const budgetStore = db.createObjectStore('budgets', { keyPath: 'id' });
        budgetStore.createIndex('month', 'month', { unique: false });
        budgetStore.createIndex('month_category', ['month', 'categoryId'], { unique: true });
      }

      if (!db.objectStoreNames.contains('expenses')) {
        const expenseStore = db.createObjectStore('expenses', { keyPath: 'id' });
        expenseStore.createIndex('date', 'date', { unique: false });
      }
    };
  });

const runTransaction = async <T>(
  stores: string[],
  mode: IDBTransactionMode,
  operation: (tx: IDBTransaction) => Promise<T>
): Promise<T> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, mode);

    operation(tx)
      .then(result => {
        tx.oncomplete = () => {
          db.close();
          resolve(result);
        };
        tx.onerror = () => reject(tx.error);
      })
      .catch(error => {
        tx.abort();
        db.close();
        reject(error);
      });
  });
};

const requestAsPromise = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const createId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const normalizeCategories = (categories: Category[]): Category[] => {
  const normalized = categories.map((category, index) => ({
    ...category,
    sortOrder: Number.isFinite(category.sortOrder) ? category.sortOrder : index
  }));

  normalized.sort((a, b) => {
    const aOrder = Number.isFinite(a.sortOrder) ? a.sortOrder : Number.MAX_SAFE_INTEGER;
    const bOrder = Number.isFinite(b.sortOrder) ? b.sortOrder : Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder || a.name.localeCompare(b.name);
  });

  return normalized;
};

const normalizeSubcategories = (subcategories: Subcategory[]): Subcategory[] => {
  const normalized = subcategories.map((subcategory, index) => ({
    ...subcategory,
    sortOrder: Number.isFinite(subcategory.sortOrder) ? subcategory.sortOrder : index
  }));

  normalized.sort((a, b) => {
    const aOrder = Number.isFinite(a.sortOrder) ? a.sortOrder : Number.MAX_SAFE_INTEGER;
    const bOrder = Number.isFinite(b.sortOrder) ? b.sortOrder : Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder || a.name.localeCompare(b.name);
  });

  return normalized;
};

const getPreviousMonth = (month: string): string => {
  const [year, monthPart] = month.split('-').map(Number);
  const previous = new Date(year, monthPart - 2, 1);
  return `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}`;
};

export const seedDefaultSubcategories = async (): Promise<void> => {
  await runTransaction(['subcategories'], 'readwrite', async tx => {
    const store = tx.objectStore('subcategories');
    const existing = await requestAsPromise(store.getAll());

    if (existing.length > 0) {
      return;
    }

    DEFAULT_SUBCATEGORY_NAMES.forEach((name, index) => {
      store.put({
        id: createId(),
        name,
        sortOrder: index
      } satisfies Subcategory);
    });
  });
};

export const getSubcategories = async (): Promise<Subcategory[]> =>
  runTransaction(['subcategories'], 'readonly', async tx => {
    const subcategories = await requestAsPromise(tx.objectStore('subcategories').getAll());
    return normalizeSubcategories(subcategories as Subcategory[]);
  });

export const addSubcategory = async (name: string): Promise<Subcategory> =>
  runTransaction(['subcategories'], 'readwrite', async tx => {
    const store = tx.objectStore('subcategories');
    const subcategories = normalizeSubcategories((await requestAsPromise(store.getAll())) as Subcategory[]);
    const trimmedName = name.trim();

    if (!trimmedName) {
      throw new Error('Subcategory name is required.');
    }

    if (subcategories.some(subcategory => subcategory.name.toLowerCase() === trimmedName.toLowerCase())) {
      throw new Error('A subcategory with this name already exists.');
    }

    const nextSubcategory: Subcategory = {
      id: createId(),
      name: trimmedName,
      sortOrder: subcategories.length
    };

    store.put(nextSubcategory);
    return nextSubcategory;
  });

export const seedDefaultCategories = async (): Promise<void> => {
  await runTransaction(['categories'], 'readwrite', async tx => {
    const store = tx.objectStore('categories');
    const existing = await requestAsPromise(store.getAll());

    if (existing.length > 0) {
      return;
    }

    const subcategoryStore = tx.objectStore('subcategories');
    const subcategories = normalizeSubcategories((await requestAsPromise(subcategoryStore.getAll())) as Subcategory[]);
    const subcategoryByName = new Map(subcategories.map(subcategory => [subcategory.name, subcategory.id] as const));

    DEFAULT_CATEGORY_NAMES.forEach((name, index) => {
      const mappedSubcategory = DEFAULT_CATEGORY_SUBCATEGORY_MAP[name];
      store.put({
        id: createId(),
        name,
        subcategoryId: mappedSubcategory ? subcategoryByName.get(mappedSubcategory) ?? null : null,
        isDefault: true,
        isArchived: false,
        sortOrder: index
      } satisfies Category);
    });
  });
};

export const getCategories = async (): Promise<Category[]> =>
  runTransaction(['categories'], 'readonly', async tx => {
    const categories = await requestAsPromise(tx.objectStore('categories').getAll());
    return normalizeCategories(categories as Category[]);
  });

export const addCategory = async (name: string, subcategoryId?: string | null): Promise<Category> =>
  runTransaction(['categories'], 'readwrite', async tx => {
    const store = tx.objectStore('categories');
    const categories = normalizeCategories((await requestAsPromise(store.getAll())) as Category[]);
    const trimmedName = name.trim();

    if (!trimmedName) {
      throw new Error('Item name is required.');
    }

    if (categories.some(category => category.name.toLowerCase() === trimmedName.toLowerCase())) {
      throw new Error('An item with this name already exists.');
    }

    const targetSubcategoryId = subcategoryId || null;
    const maxOrder = categories
      .filter(category => (category.subcategoryId ?? null) === targetSubcategoryId)
      .reduce((max, category) => Math.max(max, category.sortOrder), -1);

    const nextCategory: Category = {
      id: createId(),
      name: trimmedName,
      subcategoryId: targetSubcategoryId,
      isDefault: false,
      isArchived: false,
      sortOrder: maxOrder + 1
    };

    store.put(nextCategory);
    return nextCategory;
  });

export const ensureDefaultSubcategoryAssignments = async (): Promise<void> => {
  await runTransaction(['categories', 'subcategories'], 'readwrite', async tx => {
    const categoryStore = tx.objectStore('categories');
    const subcategoryStore = tx.objectStore('subcategories');
    const categories = normalizeCategories((await requestAsPromise(categoryStore.getAll())) as Category[]);
    const subcategories = normalizeSubcategories((await requestAsPromise(subcategoryStore.getAll())) as Subcategory[]);
    const subcategoryByName = new Map(subcategories.map(subcategory => [subcategory.name.toLowerCase(), subcategory.id] as const));
    const categoryMapping = new Map(
      Object.entries(DEFAULT_CATEGORY_SUBCATEGORY_MAP).map(([name, subcategory]) => [name.toLowerCase(), subcategory])
    );

    categories.forEach(category => {
      if (category.subcategoryId) {
        return;
      }

      const mapped = categoryMapping.get(category.name.trim().toLowerCase());
      if (!mapped) {
        return;
      }

      const subcategoryId = subcategoryByName.get(mapped.toLowerCase());
      if (!subcategoryId) {
        return;
      }

      categoryStore.put({ ...category, subcategoryId });
    });
  });
};

export const reorderCategories = async (orderedCategoryIds: string[]): Promise<void> => {
  await runTransaction(['categories'], 'readwrite', async tx => {
    const store = tx.objectStore('categories');
    const categories = normalizeCategories((await requestAsPromise(store.getAll())) as Category[]);
    const byId = new Map(categories.map(category => [category.id, category] as const));
    const seen = new Set<string>();
    let sortOrder = 0;

    orderedCategoryIds.forEach(categoryId => {
      const category = byId.get(categoryId);
      if (!category || seen.has(categoryId)) {
        return;
      }

      seen.add(categoryId);
      store.put({ ...category, sortOrder });
      sortOrder += 1;
    });

    categories.forEach(category => {
      if (seen.has(category.id)) {
        return;
      }

      store.put({ ...category, sortOrder });
      sortOrder += 1;
    });
  });
};

export const saveCategories = async (nextCategories: Category[]): Promise<void> => {
  await runTransaction(['categories'], 'readwrite', async tx => {
    const store = tx.objectStore('categories');
    nextCategories.forEach(category => {
      store.put(category);
    });
  });
};

export const archiveCategory = async (categoryId: string): Promise<void> => {
  await runTransaction(['categories'], 'readwrite', async tx => {
    const store = tx.objectStore('categories');
    const category = (await requestAsPromise(store.get(categoryId))) as Category | undefined;

    if (!category) {
      throw new Error('Item not found.');
    }

    store.put({ ...category, isArchived: true });
  });
};

export const getExpensesByMonth = async (month: string): Promise<Expense[]> => {
  const [year, monthPart] = month.split('-').map(Number);
  const start = `${year}-${String(monthPart).padStart(2, '0')}-01`;
  const endDate = new Date(year, monthPart, 0);
  const end = `${year}-${String(monthPart).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

  return runTransaction(['expenses'], 'readonly', async tx => {
    const index = tx.objectStore('expenses').index('date');
    const range = IDBKeyRange.bound(start, end);
    const expenses = await requestAsPromise(index.getAll(range));
    return (expenses as Expense[]).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  });
};

export const getBudgetsByMonth = async (month: string): Promise<Budget[]> =>
  runTransaction(['budgets'], 'readonly', async tx => {
    const index = tx.objectStore('budgets').index('month');
    const budgets = await requestAsPromise(index.getAll(month));
    return budgets as Budget[];
  });

export const autoCopyBudgetsFromPreviousMonth = async (
  month: string
): Promise<{ copiedCount: number; sourceMonth: string | null }> =>
  runTransaction(['budgets'], 'readwrite', async tx => {
    const store = tx.objectStore('budgets');
    const index = store.index('month');
    const targetBudgets = (await requestAsPromise(index.getAll(month))) as Budget[];

    if (targetBudgets.length > 0) {
      return { copiedCount: 0, sourceMonth: null };
    }

    const sourceMonth = getPreviousMonth(month);
    const previousBudgets = (await requestAsPromise(index.getAll(sourceMonth))) as Budget[];

    if (previousBudgets.length === 0) {
      return { copiedCount: 0, sourceMonth: null };
    }

    previousBudgets.forEach(budget => {
      store.put({
        ...budget,
        id: createId(),
        month
      } satisfies Budget);
    });

    return { copiedCount: previousBudgets.length, sourceMonth };
  });

export const upsertBudget = async (month: string, categoryId: string, amountCents: number): Promise<Budget> =>
  runTransaction(['budgets'], 'readwrite', async tx => {
    const store = tx.objectStore('budgets');
    const index = store.index('month_category');
    const existing = (await requestAsPromise(index.get([month, categoryId]))) as Budget | undefined;

    const budget: Budget = {
      id: existing?.id ?? createId(),
      month,
      categoryId,
      amountCents
    };

    store.put(budget);
    return budget;
  });

export const addExpense = async (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<Expense> => {
  const now = new Date().toISOString();
  const nextExpense: Expense = {
    ...expense,
    id: createId(),
    createdAt: now,
    updatedAt: now
  };

  await runTransaction(['expenses'], 'readwrite', async tx => {
    tx.objectStore('expenses').put(nextExpense);
  });

  return nextExpense;
};

export const updateExpense = async (expense: Expense): Promise<Expense> => {
  const updated: Expense = {
    ...expense,
    updatedAt: new Date().toISOString()
  };

  await runTransaction(['expenses'], 'readwrite', async tx => {
    tx.objectStore('expenses').put(updated);
  });

  return updated;
};

export const deleteExpense = async (id: string): Promise<void> => {
  await runTransaction(['expenses'], 'readwrite', async tx => {
    tx.objectStore('expenses').delete(id);
  });
};

export const getRecentMerchants = async (limit = 8): Promise<string[]> =>
  runTransaction(['expenses'], 'readonly', async tx => {
    const expenses = (await requestAsPromise(tx.objectStore('expenses').getAll())) as Expense[];
    const sorted = expenses.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    const seen = new Set<string>();
    const merchants: string[] = [];

    sorted.forEach(expense => {
      const merchant = expense.merchant?.trim();
      if (!merchant) {
        return;
      }

      const key = merchant.toLowerCase();
      if (seen.has(key) || merchants.length >= limit) {
        return;
      }

      seen.add(key);
      merchants.push(merchant);
    });

    return merchants;
  });

export const getLastUsedCategory = (): string | null => localStorage.getItem(LAST_CATEGORY_KEY);

export const setLastUsedCategory = (categoryId: string): void => {
  localStorage.setItem(LAST_CATEGORY_KEY, categoryId);
};
