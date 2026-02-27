export type Category = {
  id: string;
  name: string;
  isDefault: boolean;
  isArchived: boolean;
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
const DB_VERSION = 1;
const LAST_CATEGORY_KEY = 'expense-tracker-last-category';

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

export const seedDefaultCategories = async (): Promise<void> => {
  await runTransaction(['categories'], 'readwrite', async tx => {
    const store = tx.objectStore('categories');
    const existing = await requestAsPromise(store.getAll());

    if (existing.length > 0) {
      return;
    }

    DEFAULT_CATEGORY_NAMES.forEach(name => {
      store.put({
        id: createId(),
        name,
        isDefault: true,
        isArchived: false
      } satisfies Category);
    });
  });
};

export const getCategories = async (): Promise<Category[]> =>
  runTransaction(['categories'], 'readonly', async tx => {
    const categories = await requestAsPromise(tx.objectStore('categories').getAll());
    return (categories as Category[]).sort((a, b) => a.name.localeCompare(b.name));
  });

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

export const getLastUsedCategory = (): string | null => localStorage.getItem(LAST_CATEGORY_KEY);

export const setLastUsedCategory = (categoryId: string): void => {
  localStorage.setItem(LAST_CATEGORY_KEY, categoryId);
};
