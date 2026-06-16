export type DebtRecord = {
  id: string;
  name: string;
  openingBalanceCents: number;
  startingBalanceCents?: number;
  annualAprPercent: number;
  minimumPaymentCents: number;
  createdAt: string;
  updatedAt: string;
};

export type DebtLedgerEntryType = 'payment' | 'interest' | 'fee' | 'adjustment';
export type DebtLedgerEntryDirection = 'increase' | 'decrease';

export type DebtLedgerEntry = {
  id: string;
  debtId: string;
  type: DebtLedgerEntryType;
  direction: DebtLedgerEntryDirection;
  amountCents: number;
  date: string;
  note?: string;
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

export type DebtMetrics = {
  totalPaymentsCents: number;
  totalInterestCents: number;
  totalFeesCents: number;
  totalAdjustmentsCents: number;
  currentBalanceCents: number;
  progressPercent: number;
};

export type DebtLogSnapshot = {
  version: 2;
  exportedAt: string;
  debts: DebtRecord[];
  ledgerEntries: DebtLedgerEntry[];
  settings?: {
    plannerMonthlyBudgetCents?: number;
  };
};

export type ImportResult = {
  importedCount: number;
  errors: string[];
};

type AddDebtInput = {
  name: string;
  openingBalanceCents: number;
  annualAprPercent: number;
  minimumPaymentCents: number;
};

type UpdateDebtInput = Partial<AddDebtInput>;

type AddDebtLedgerEntryInput = {
  debtId: string;
  type: DebtLedgerEntryType;
  direction?: DebtLedgerEntryDirection;
  amountCents: number;
  date: string;
  note?: string;
};

type UpdateDebtLedgerEntryInput = Partial<Omit<AddDebtLedgerEntryInput, 'debtId'>> & {
  debtId?: string;
};

const DB_NAME = 'debt-log-db';
const DB_VERSION = 2;
const DEBT_STORE = 'debts';
const LEGACY_PAYMENT_STORE = 'debtPayments';
const LEDGER_STORE = 'debtLedgerEntries';
const DEBT_CSV_HEADERS = ['id', 'name', 'openingBalance', 'annualAprPercent', 'minimumPayment', 'createdAt', 'updatedAt'];
const LEDGER_CSV_HEADERS = ['id', 'debtId', 'type', 'direction', 'amount', 'date', 'note', 'createdAt', 'updatedAt'];

const createId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const todayString = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

const requestAsPromise = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const normalizeDebtRecord = (debt: DebtRecord): DebtRecord => ({
  ...debt,
  openingBalanceCents: debt.openingBalanceCents ?? debt.startingBalanceCents ?? 0
});

const normalizeLedgerEntry = (entry: DebtLedgerEntry): DebtLedgerEntry => ({
  ...entry,
  direction: entry.direction ?? getDefaultDirection(entry.type),
  updatedAt: entry.updatedAt ?? entry.createdAt
});

const migrateDebtsToOpeningBalance = (debtStore: IDBObjectStore) => {
  const cursorRequest = debtStore.openCursor();
  cursorRequest.onsuccess = () => {
    const cursor = cursorRequest.result;
    if (!cursor) {
      return;
    }

    const debt = cursor.value as DebtRecord;
    if (debt.openingBalanceCents === undefined && debt.startingBalanceCents !== undefined) {
      cursor.update({ ...debt, openingBalanceCents: debt.startingBalanceCents });
    }

    cursor.continue();
  };
};

const migratePaymentsToLedger = (paymentStore: IDBObjectStore, ledgerStore: IDBObjectStore) => {
  const cursorRequest = paymentStore.openCursor();
  cursorRequest.onsuccess = () => {
    const cursor = cursorRequest.result;
    if (!cursor) {
      return;
    }

    const payment = cursor.value as DebtPayment;
    const migratedEntry: DebtLedgerEntry = {
      id: payment.id,
      debtId: payment.debtId,
      type: 'payment',
      direction: 'decrease',
      amountCents: payment.amountCents,
      date: payment.date,
      note: payment.note,
      createdAt: payment.createdAt,
      updatedAt: payment.createdAt
    };

    ledgerStore.put(migratedEntry);
    cursor.continue();
  };
};

const openDb = async (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(DEBT_STORE)) {
        const debtStore = db.createObjectStore(DEBT_STORE, { keyPath: 'id' });
        debtStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(LEGACY_PAYMENT_STORE)) {
        const paymentStore = db.createObjectStore(LEGACY_PAYMENT_STORE, { keyPath: 'id' });
        paymentStore.createIndex('debtId', 'debtId', { unique: false });
        paymentStore.createIndex('debtId_date', ['debtId', 'date'], { unique: false });
      }

      if (!db.objectStoreNames.contains(LEDGER_STORE)) {
        const ledgerStore = db.createObjectStore(LEDGER_STORE, { keyPath: 'id' });
        ledgerStore.createIndex('debtId', 'debtId', { unique: false });
        ledgerStore.createIndex('debtId_date', ['debtId', 'date'], { unique: false });
        ledgerStore.createIndex('date', 'date', { unique: false });
      }

      if (request.oldVersion < 2) {
        const debtStore = request.transaction?.objectStore(DEBT_STORE);
        const paymentStore = request.transaction?.objectStore(LEGACY_PAYMENT_STORE);
        const ledgerStore = request.transaction?.objectStore(LEDGER_STORE);

        if (debtStore) {
          migrateDebtsToOpeningBalance(debtStore);
        }

        if (paymentStore && ledgerStore) {
          migratePaymentsToLedger(paymentStore, ledgerStore);
        }
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
    let operationResult: T;

    tx.oncomplete = () => {
      db.close();
      resolve(operationResult);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error ?? new Error('Debt log transaction was aborted.'));
    };

    operation(tx)
      .then(result => {
        operationResult = result;
      })
      .catch(error => {
        tx.abort();
        reject(error);
      });
  });
};

const sortDebts = (debts: DebtRecord[]): DebtRecord[] =>
  [...debts].map(normalizeDebtRecord).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

const sortLedgerEntries = (entries: DebtLedgerEntry[]): DebtLedgerEntry[] =>
  [...entries].map(normalizeLedgerEntry).sort((a, b) => {
    const byDate = b.date.localeCompare(a.date);
    if (byDate !== 0) {
      return byDate;
    }

    return b.createdAt.localeCompare(a.createdAt);
  });

const getDefaultDirection = (type: DebtLedgerEntryType): DebtLedgerEntryDirection =>
  type === 'payment' ? 'decrease' : 'increase';

const isLedgerEntryType = (value: string): value is DebtLedgerEntryType =>
  ['payment', 'interest', 'fee', 'adjustment'].includes(value);

const isLedgerEntryDirection = (value: string): value is DebtLedgerEntryDirection =>
  ['increase', 'decrease'].includes(value);

const validateDebtInput = (input: AddDebtInput) => {
  if (!input.name.trim()) {
    throw new Error('Debt name is required.');
  }

  if (input.openingBalanceCents <= 0) {
    throw new Error('Opening balance must be greater than zero.');
  }

  if (input.annualAprPercent < 0 || input.annualAprPercent > 100) {
    throw new Error('Annual APR must be between 0 and 100.');
  }

  if (input.minimumPaymentCents <= 0) {
    throw new Error('Minimum payment must be greater than zero.');
  }
};

const validateLedgerEntryInput = (input: AddDebtLedgerEntryInput) => {
  if (!input.debtId.trim()) {
    throw new Error('Debt id is required.');
  }

  if (input.amountCents <= 0) {
    throw new Error('Entry amount must be greater than zero.');
  }

  if (!input.date.trim()) {
    throw new Error('Entry date is required.');
  }

  if (!isLedgerEntryType(input.type)) {
    throw new Error('Entry type is invalid.');
  }

  if (input.direction && !isLedgerEntryDirection(input.direction)) {
    throw new Error('Entry direction is invalid.');
  }
};

export const getDebtBalanceCents = (debt: DebtRecord, entries: DebtLedgerEntry[]): number => {
  const normalizedDebt = normalizeDebtRecord(debt);
  const balance = entries.reduce((total, entry) => {
    const normalizedEntry = normalizeLedgerEntry(entry);
    return normalizedEntry.direction === 'increase'
      ? total + normalizedEntry.amountCents
      : total - normalizedEntry.amountCents;
  }, normalizedDebt.openingBalanceCents);

  return Math.max(Math.round(balance), 0);
};

export const getDebtMetrics = (debt: DebtRecord, entries: DebtLedgerEntry[]): DebtMetrics => {
  const normalizedDebt = normalizeDebtRecord(debt);
  const currentBalanceCents = getDebtBalanceCents(normalizedDebt, entries);
  const totalPaymentsCents = entries
    .filter(entry => entry.type === 'payment')
    .reduce((sum, entry) => sum + entry.amountCents, 0);
  const totalInterestCents = entries
    .filter(entry => entry.type === 'interest')
    .reduce((sum, entry) => sum + entry.amountCents, 0);
  const totalFeesCents = entries
    .filter(entry => entry.type === 'fee')
    .reduce((sum, entry) => sum + entry.amountCents, 0);
  const totalAdjustmentsCents = entries
    .filter(entry => entry.type === 'adjustment')
    .reduce((sum, entry) => {
      const normalizedEntry = normalizeLedgerEntry(entry);
      return normalizedEntry.direction === 'increase' ? sum + normalizedEntry.amountCents : sum - normalizedEntry.amountCents;
    }, 0);
  const progressPercent =
    normalizedDebt.openingBalanceCents > 0
      ? Math.min(Math.max(((normalizedDebt.openingBalanceCents - currentBalanceCents) / normalizedDebt.openingBalanceCents) * 100, 0), 100)
      : 0;

  return {
    totalPaymentsCents,
    totalInterestCents,
    totalFeesCents,
    totalAdjustmentsCents,
    currentBalanceCents,
    progressPercent
  };
};

export const groupLedgerEntriesByDebt = (entries: DebtLedgerEntry[]): Record<string, DebtLedgerEntry[]> =>
  entries.reduce<Record<string, DebtLedgerEntry[]>>((acc, entry) => {
    if (!acc[entry.debtId]) {
      acc[entry.debtId] = [];
    }

    acc[entry.debtId].push(entry);
    return acc;
  }, {});

export const getDebts = async (): Promise<DebtRecord[]> =>
  runTransaction([DEBT_STORE], 'readonly', async tx => {
    const debts = (await requestAsPromise(tx.objectStore(DEBT_STORE).getAll())) as DebtRecord[];
    return sortDebts(debts);
  });

export const getDebtLedgerEntries = async (): Promise<DebtLedgerEntry[]> =>
  runTransaction([LEDGER_STORE], 'readonly', async tx => {
    const entries = (await requestAsPromise(tx.objectStore(LEDGER_STORE).getAll())) as DebtLedgerEntry[];
    return sortLedgerEntries(entries);
  });

export const getDebtPayments = async (): Promise<DebtPayment[]> => {
  const entries = await getDebtLedgerEntries();
  return entries
    .filter(entry => entry.type === 'payment')
    .map(entry => ({
      id: entry.id,
      debtId: entry.debtId,
      amountCents: entry.amountCents,
      date: entry.date,
      note: entry.note,
      createdAt: entry.createdAt
    }));
};

export const addDebt = async (input: AddDebtInput): Promise<DebtRecord> =>
  runTransaction([DEBT_STORE], 'readwrite', async tx => {
    validateDebtInput(input);

    const now = new Date().toISOString();
    const nextDebt: DebtRecord = {
      id: createId(),
      name: input.name.trim(),
      openingBalanceCents: input.openingBalanceCents,
      annualAprPercent: input.annualAprPercent,
      minimumPaymentCents: input.minimumPaymentCents,
      createdAt: now,
      updatedAt: now
    };

    tx.objectStore(DEBT_STORE).put(nextDebt);
    return nextDebt;
  });

export const updateDebt = async (debtId: string, input: UpdateDebtInput): Promise<DebtRecord> =>
  runTransaction([DEBT_STORE], 'readwrite', async tx => {
    const debtStore = tx.objectStore(DEBT_STORE);
    const existingRecord = (await requestAsPromise(debtStore.get(debtId))) as DebtRecord | undefined;
    if (!existingRecord) {
      throw new Error('Debt not found.');
    }

    const existing = normalizeDebtRecord(existingRecord);

    const nextDebt: DebtRecord = {
      ...existing,
      name: input.name?.trim() ?? existing.name,
      openingBalanceCents: input.openingBalanceCents ?? existing.openingBalanceCents,
      annualAprPercent: input.annualAprPercent ?? existing.annualAprPercent,
      minimumPaymentCents: input.minimumPaymentCents ?? existing.minimumPaymentCents,
      updatedAt: new Date().toISOString()
    };
    validateDebtInput(nextDebt);

    debtStore.put(nextDebt);
    return nextDebt;
  });

export const deleteDebt = async (debtId: string): Promise<void> =>
  runTransaction([DEBT_STORE, LEDGER_STORE], 'readwrite', async tx => {
    tx.objectStore(DEBT_STORE).delete(debtId);

    const ledgerIndex = tx.objectStore(LEDGER_STORE).index('debtId');
    const cursorRequest = ledgerIndex.openCursor(IDBKeyRange.only(debtId));
    await new Promise<void>((resolve, reject) => {
      cursorRequest.onerror = () => reject(cursorRequest.error);
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) {
          resolve();
          return;
        }

        cursor.delete();
        cursor.continue();
      };
    });
  });

export const addDebtLedgerEntry = async (input: AddDebtLedgerEntryInput): Promise<DebtLedgerEntry> =>
  runTransaction([DEBT_STORE, LEDGER_STORE], 'readwrite', async tx => {
    validateLedgerEntryInput(input);

    const debtStore = tx.objectStore(DEBT_STORE);
    const debt = (await requestAsPromise(debtStore.get(input.debtId))) as DebtRecord | undefined;
    if (!debt) {
      throw new Error('Debt not found.');
    }

    const now = new Date().toISOString();
    const nextEntry: DebtLedgerEntry = {
      id: createId(),
      debtId: input.debtId,
      type: input.type,
      direction: input.direction ?? getDefaultDirection(input.type),
      amountCents: input.amountCents,
      date: input.date,
      note: input.note?.trim() || undefined,
      createdAt: now,
      updatedAt: now
    };

    tx.objectStore(LEDGER_STORE).put(nextEntry);
    debtStore.put({ ...debt, updatedAt: now });

    return nextEntry;
  });

export const addDebtPayment = async (input: {
  debtId: string;
  amountCents: number;
  date: string;
  note?: string;
}): Promise<DebtLedgerEntry> =>
  addDebtLedgerEntry({
    ...input,
    type: 'payment',
    direction: 'decrease'
  });

export const updateDebtLedgerEntry = async (entryId: string, input: UpdateDebtLedgerEntryInput): Promise<DebtLedgerEntry> =>
  runTransaction([DEBT_STORE, LEDGER_STORE], 'readwrite', async tx => {
    const ledgerStore = tx.objectStore(LEDGER_STORE);
    const existingEntry = (await requestAsPromise(ledgerStore.get(entryId))) as DebtLedgerEntry | undefined;
    if (!existingEntry) {
      throw new Error('Ledger entry not found.');
    }

    const existing = normalizeLedgerEntry(existingEntry);

    const nextEntry: DebtLedgerEntry = {
      ...existing,
      debtId: input.debtId ?? existing.debtId,
      type: input.type ?? existing.type,
      direction: input.direction ?? existing.direction,
      amountCents: input.amountCents ?? existing.amountCents,
      date: input.date ?? existing.date,
      note: input.note?.trim() || undefined,
      updatedAt: new Date().toISOString()
    };
    validateLedgerEntryInput(nextEntry);

    const debtStore = tx.objectStore(DEBT_STORE);
    const debt = (await requestAsPromise(debtStore.get(nextEntry.debtId))) as DebtRecord | undefined;
    if (!debt) {
      throw new Error('Debt not found.');
    }

    ledgerStore.put(nextEntry);
    debtStore.put({ ...debt, updatedAt: nextEntry.updatedAt });
    return nextEntry;
  });

export const deleteDebtLedgerEntry = async (entryId: string): Promise<void> =>
  runTransaction([LEDGER_STORE], 'readwrite', async tx => {
    tx.objectStore(LEDGER_STORE).delete(entryId);
  });

export const getDebtLogSnapshot = async (settings?: DebtLogSnapshot['settings']): Promise<DebtLogSnapshot> => {
  const [debts, ledgerEntries] = await Promise.all([getDebts(), getDebtLedgerEntries()]);
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    debts,
    ledgerEntries,
    settings
  };
};

export const restoreDebtLogSnapshot = async (snapshot: DebtLogSnapshot): Promise<void> =>
  runTransaction([DEBT_STORE, LEDGER_STORE], 'readwrite', async tx => {
    if (!Array.isArray(snapshot.debts) || !Array.isArray(snapshot.ledgerEntries)) {
      throw new Error('Backup file is missing debt log data.');
    }

    const debtErrors = validateDebtRows(snapshot.debts);
    const ledgerErrors = validateLedgerRows(snapshot.ledgerEntries, new Set(snapshot.debts.map(debt => debt.id)));
    const errors = [...debtErrors, ...ledgerErrors];
    if (errors.length > 0) {
      throw new Error(errors.join(' '));
    }

    await clearStore(tx.objectStore(DEBT_STORE));
    await clearStore(tx.objectStore(LEDGER_STORE));

    const debtStore = tx.objectStore(DEBT_STORE);
    snapshot.debts.forEach(debt => debtStore.put(normalizeDebtRecord(debt)));

    const ledgerStore = tx.objectStore(LEDGER_STORE);
    snapshot.ledgerEntries.forEach(entry => ledgerStore.put(normalizeLedgerEntry(entry)));
  });

const clearStore = (store: IDBObjectStore): Promise<void> =>
  new Promise((resolve, reject) => {
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

const moneyToCsvValue = (cents: number): string => (cents / 100).toFixed(2);

const parseMoneyToCents = (value: string): number | null => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.round(parsed * 100);
};

const escapeCsvValue = (value: string | number | undefined): string => {
  const text = value === undefined ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const toCsv = (headers: string[], rows: Array<Record<string, string | number | undefined>>): string =>
  [headers.join(','), ...rows.map(row => headers.map(header => escapeCsvValue(row[header])).join(','))].join('\n');

export const exportDebtsCsv = (debts: DebtRecord[]): string =>
  toCsv(
    DEBT_CSV_HEADERS,
    sortDebts(debts).map(debt => ({
      id: debt.id,
      name: debt.name,
      openingBalance: moneyToCsvValue(debt.openingBalanceCents),
      annualAprPercent: debt.annualAprPercent,
      minimumPayment: moneyToCsvValue(debt.minimumPaymentCents),
      createdAt: debt.createdAt,
      updatedAt: debt.updatedAt
    }))
  );

export const exportLedgerEntriesCsv = (entries: DebtLedgerEntry[]): string =>
  toCsv(
    LEDGER_CSV_HEADERS,
    sortLedgerEntries(entries).map(entry => ({
      id: entry.id,
      debtId: entry.debtId,
      type: entry.type,
      direction: entry.direction,
      amount: moneyToCsvValue(entry.amountCents),
      date: entry.date,
      note: entry.note,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt
    }))
  );

const parseCsv = (csv: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let inQuotes = false;

  for (let index = 0; index < csv.length; index++) {
    const char = csv[index];
    const nextChar = csv[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        value += '"';
        index++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(value);
      value = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index++;
      }

      row.push(value);
      if (row.some(cell => cell.trim() !== '')) {
        rows.push(row);
      }
      row = [];
      value = '';
      continue;
    }

    value += char;
  }

  row.push(value);
  if (row.some(cell => cell.trim() !== '')) {
    rows.push(row);
  }

  return rows;
};

const parseCsvObjects = (csv: string): Array<Record<string, string>> => {
  const rows = parseCsv(csv);
  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map(header => header.trim());
  return rows.slice(1).map(row =>
    headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = row[index]?.trim() ?? '';
      return acc;
    }, {})
  );
};

const parseDebtRows = (csv: string): { debts: DebtRecord[]; errors: string[] } => {
  const rows = parseCsvObjects(csv);
  const now = new Date().toISOString();
  const errors: string[] = [];
  const debts: DebtRecord[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const openingBalanceCents = parseMoneyToCents(row.openingBalance);
    const minimumPaymentCents = parseMoneyToCents(row.minimumPayment);
    const annualAprPercent = Number(row.annualAprPercent);
    const id = row.id || createId();
    const debt: DebtRecord = {
      id,
      name: row.name,
      openingBalanceCents: openingBalanceCents ?? 0,
      annualAprPercent,
      minimumPaymentCents: minimumPaymentCents ?? 0,
      createdAt: row.createdAt || now,
      updatedAt: row.updatedAt || now
    };

    try {
      validateDebtInput(debt);
    } catch (error) {
      errors.push(`Debt row ${rowNumber}: ${error instanceof Error ? error.message : 'Invalid debt row.'}`);
    }

    debts.push(debt);
  });

  return { debts, errors };
};

const parseLedgerRows = (csv: string): { entries: DebtLedgerEntry[]; errors: string[] } => {
  const rows = parseCsvObjects(csv);
  const now = new Date().toISOString();
  const errors: string[] = [];
  const entries: DebtLedgerEntry[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const amountCents = parseMoneyToCents(row.amount);
    const entry: DebtLedgerEntry = {
      id: row.id || createId(),
      debtId: row.debtId,
      type: row.type as DebtLedgerEntryType,
      direction: (row.direction || getDefaultDirection(row.type as DebtLedgerEntryType)) as DebtLedgerEntryDirection,
      amountCents: amountCents ?? 0,
      date: row.date || todayString(),
      note: row.note || undefined,
      createdAt: row.createdAt || now,
      updatedAt: row.updatedAt || now
    };

    try {
      validateLedgerEntryInput(entry);
    } catch (error) {
      errors.push(`Ledger row ${rowNumber}: ${error instanceof Error ? error.message : 'Invalid ledger row.'}`);
    }

    entries.push(entry);
  });

  return { entries, errors };
};

const validateDebtRows = (debts: DebtRecord[]): string[] => {
  const errors: string[] = [];
  const seenIds = new Set<string>();

  debts.forEach((debt, index) => {
    try {
      if (!debt.id.trim()) {
        throw new Error('Debt id is required.');
      }
      if (seenIds.has(debt.id)) {
        throw new Error('Debt id must be unique.');
      }
      validateDebtInput(normalizeDebtRecord(debt));
    } catch (error) {
      errors.push(`Debt row ${index + 1}: ${error instanceof Error ? error.message : 'Invalid debt.'}`);
    }

    seenIds.add(debt.id);
  });

  return errors;
};

const validateLedgerRows = (entries: DebtLedgerEntry[], debtIds: Set<string>): string[] => {
  const errors: string[] = [];
  const seenIds = new Set<string>();

  entries.forEach((entry, index) => {
    try {
      if (!entry.id.trim()) {
        throw new Error('Ledger entry id is required.');
      }
      if (seenIds.has(entry.id)) {
        throw new Error('Ledger entry id must be unique.');
      }
      if (!debtIds.has(entry.debtId)) {
        throw new Error('Ledger entry references a missing debt.');
      }
      validateLedgerEntryInput(normalizeLedgerEntry(entry));
    } catch (error) {
      errors.push(`Ledger row ${index + 1}: ${error instanceof Error ? error.message : 'Invalid ledger entry.'}`);
    }

    seenIds.add(entry.id);
  });

  return errors;
};

export const importDebtsCsv = async (csv: string): Promise<ImportResult> => {
  const { debts, errors } = parseDebtRows(csv);
  const validationErrors = validateDebtRows(debts);
  const allErrors = [...errors, ...validationErrors];
  if (allErrors.length > 0) {
    return { importedCount: 0, errors: allErrors };
  }

  await runTransaction([DEBT_STORE], 'readwrite', async tx => {
    const debtStore = tx.objectStore(DEBT_STORE);
    debts.forEach(debt => debtStore.put(normalizeDebtRecord(debt)));
  });

  return { importedCount: debts.length, errors: [] };
};

export const importLedgerEntriesCsv = async (csv: string): Promise<ImportResult> => {
  const [existingDebts] = await Promise.all([getDebts()]);
  const debtIds = new Set(existingDebts.map(debt => debt.id));
  const { entries, errors } = parseLedgerRows(csv);
  const validationErrors = validateLedgerRows(entries, debtIds);
  const allErrors = [...errors, ...validationErrors];
  if (allErrors.length > 0) {
    return { importedCount: 0, errors: allErrors };
  }

  await runTransaction([LEDGER_STORE], 'readwrite', async tx => {
    const ledgerStore = tx.objectStore(LEDGER_STORE);
    entries.forEach(entry => ledgerStore.put(normalizeLedgerEntry(entry)));
  });

  return { importedCount: entries.length, errors: [] };
};
