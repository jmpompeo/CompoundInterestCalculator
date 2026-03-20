export type DebtRecord = {
  id: string;
  name: string;
  startingBalanceCents: number;
  annualAprPercent: number;
  minimumPaymentCents: number;
  createdAt: string;
  updatedAt: string;
};

export type DebtPayment = {
  id: string;
  debtId: string;
  amountCents: number;
  date: string;
  note?: string;
  createdAt: string;
};

type AddDebtInput = {
  name: string;
  startingBalanceCents: number;
  annualAprPercent: number;
  minimumPaymentCents: number;
};

type AddDebtPaymentInput = {
  debtId: string;
  amountCents: number;
  date: string;
  note?: string;
};

const DB_NAME = 'debt-log-db';
const DB_VERSION = 1;

const createId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const requestAsPromise = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const openDb = async (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains('debts')) {
        const debtStore = db.createObjectStore('debts', { keyPath: 'id' });
        debtStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('debtPayments')) {
        const paymentStore = db.createObjectStore('debtPayments', { keyPath: 'id' });
        paymentStore.createIndex('debtId', 'debtId', { unique: false });
        paymentStore.createIndex('debtId_date', ['debtId', 'date'], { unique: false });
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

const sortDebts = (debts: DebtRecord[]): DebtRecord[] =>
  [...debts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

const sortDebtPayments = (payments: DebtPayment[]): DebtPayment[] =>
  [...payments].sort((a, b) => {
    const byDate = b.date.localeCompare(a.date);
    if (byDate !== 0) {
      return byDate;
    }

    return b.createdAt.localeCompare(a.createdAt);
  });

export const getDebts = async (): Promise<DebtRecord[]> =>
  runTransaction(['debts'], 'readonly', async tx => {
    const debts = (await requestAsPromise(tx.objectStore('debts').getAll())) as DebtRecord[];
    return sortDebts(debts);
  });

export const getDebtPayments = async (): Promise<DebtPayment[]> =>
  runTransaction(['debtPayments'], 'readonly', async tx => {
    const payments = (await requestAsPromise(tx.objectStore('debtPayments').getAll())) as DebtPayment[];
    return sortDebtPayments(payments);
  });

export const addDebt = async (input: AddDebtInput): Promise<DebtRecord> =>
  runTransaction(['debts'], 'readwrite', async tx => {
    const trimmedName = input.name.trim();
    if (!trimmedName) {
      throw new Error('Debt name is required.');
    }

    if (input.startingBalanceCents <= 0) {
      throw new Error('Current balance must be greater than zero.');
    }

    if (input.annualAprPercent < 0 || input.annualAprPercent > 1200) {
      throw new Error('Annual APR must be between 0 and 1200.');
    }

    if (input.minimumPaymentCents <= 0) {
      throw new Error('Minimum payment must be greater than zero.');
    }

    const now = new Date().toISOString();
    const nextDebt: DebtRecord = {
      id: createId(),
      name: trimmedName,
      startingBalanceCents: input.startingBalanceCents,
      annualAprPercent: input.annualAprPercent,
      minimumPaymentCents: input.minimumPaymentCents,
      createdAt: now,
      updatedAt: now
    };

    tx.objectStore('debts').put(nextDebt);
    return nextDebt;
  });

export const addDebtPayment = async (input: AddDebtPaymentInput): Promise<DebtPayment> =>
  runTransaction(['debts', 'debtPayments'], 'readwrite', async tx => {
    if (!input.debtId.trim()) {
      throw new Error('Debt id is required.');
    }

    if (input.amountCents <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    if (!input.date.trim()) {
      throw new Error('Payment date is required.');
    }

    const debtStore = tx.objectStore('debts');
    const debt = (await requestAsPromise(debtStore.get(input.debtId))) as DebtRecord | undefined;
    if (!debt) {
      throw new Error('Debt not found.');
    }

    const now = new Date().toISOString();
    const paymentStore = tx.objectStore('debtPayments');
    const nextPayment: DebtPayment = {
      id: createId(),
      debtId: input.debtId,
      amountCents: input.amountCents,
      date: input.date,
      note: input.note?.trim() || undefined,
      createdAt: now
    };

    paymentStore.put(nextPayment);
    debtStore.put({ ...debt, updatedAt: now });

    return nextPayment;
  });
