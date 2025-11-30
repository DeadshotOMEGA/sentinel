import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface QueuedCheckin {
  id: string; // UUID
  serialNumber: string; // Badge serial
  kioskId: string;
  timestamp: Date;
  localTimestamp: number; // Device time in ms (for clock drift detection)
  sequenceNumber: number; // Monotonic counter per kiosk
  retryCount: number;
  createdAt: Date;
}

interface SentinelQueueDB extends DBSchema {
  checkins: {
    key: string;
    value: QueuedCheckin;
    indexes: {
      'by-timestamp': Date;
      'by-serial-number': string;
    };
  };
}

const DB_NAME = 'sentinel-queue';
const DB_VERSION = 1;
const STORE_NAME = 'checkins';
const MAX_QUEUE_SIZE = 10000;
const MAX_AGE_DAYS = 7;

let db: IDBPDatabase<SentinelQueueDB> | null = null;

async function getDB(): Promise<IDBPDatabase<SentinelQueueDB>> {
  if (!db) {
    throw new Error('Database not initialized. Call initDB() first.');
  }
  return db;
}

async function pruneOldItems(): Promise<number> {
  const database = await getDB();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - MAX_AGE_DAYS);

  const tx = database.transaction(STORE_NAME, 'readwrite');
  const store = tx.store;
  const index = store.index('by-timestamp');

  let deletedCount = 0;
  const allKeys = await index.getAllKeys();

  for (const key of allKeys) {
    const item = await store.get(key as string);
    if (item && item.timestamp < cutoff) {
      await store.delete(key);
      deletedCount += 1;
    } else {
      // Since items are sorted by timestamp, we can break once we reach a non-expired item
      break;
    }
  }

  if (deletedCount > 0) {
    console.info(`[Queue] Cleaned ${deletedCount} expired items older than ${MAX_AGE_DAYS} days`);
  }

  return deletedCount;
}

async function enforceQueueLimit(): Promise<void> {
  const database = await getDB();
  const count = await database.count(STORE_NAME);

  if (count > MAX_QUEUE_SIZE) {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.store;
    const index = store.index('by-timestamp');

    // Get all keys sorted by timestamp (oldest first)
    const allKeys = await index.getAllKeys();

    // Delete oldest items until we're under the limit
    const toDelete = count - MAX_QUEUE_SIZE;
    console.warn(`[Queue] Queue at max capacity (${count}/${MAX_QUEUE_SIZE}), dropping ${toDelete} oldest items`);

    for (let i = 0; i < toDelete; i++) {
      await store.delete(allKeys[i]);
    }
  }
}

export async function initDB(): Promise<void> {
  if (db) {
    return; // Already initialized
  }

  db = await openDB<SentinelQueueDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      // Create object store if it doesn't exist
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        // Create indexes for querying
        store.createIndex('by-timestamp', 'timestamp');
        store.createIndex('by-serial-number', 'serialNumber');
      }
    },
  });

  // Prune old items on initialization
  await pruneOldItems();
}

export async function enqueue(checkin: QueuedCheckin): Promise<void> {
  const database = await getDB();
  await database.add(STORE_NAME, checkin);

  // Enforce queue size limit after adding
  await enforceQueueLimit();
}

export async function dequeue(): Promise<QueuedCheckin | undefined> {
  const database = await getDB();
  const tx = database.transaction(STORE_NAME, 'readwrite');
  const store = tx.store;

  // Get the first item (oldest by timestamp)
  const index = store.index('by-timestamp');
  const allKeys = await index.getAllKeys();

  if (allKeys.length === 0) {
    return undefined;
  }

  const key = allKeys[0] as string;
  const checkin = await store.get(key);
  await store.delete(key);

  return checkin;
}

export async function peek(): Promise<QueuedCheckin | undefined> {
  const database = await getDB();
  const tx = database.transaction(STORE_NAME, 'readonly');
  const store = tx.store;

  // Get the first item (oldest by timestamp) without removing
  const index = store.index('by-timestamp');
  const allKeys = await index.getAllKeys();

  if (allKeys.length === 0) {
    return undefined;
  }

  const key = allKeys[0] as string;
  const item = await store.get(key);

  return item;
}

export async function remove(id: string): Promise<void> {
  const database = await getDB();
  await database.delete(STORE_NAME, id);
}

export async function clear(): Promise<void> {
  const database = await getDB();
  await database.clear(STORE_NAME);
}

export async function getAll(): Promise<QueuedCheckin[]> {
  const database = await getDB();
  const tx = database.transaction(STORE_NAME, 'readonly');
  const store = tx.store;
  const index = store.index('by-timestamp');

  // Get all items sorted by timestamp (oldest first)
  return await index.getAll();
}

export async function getSize(): Promise<number> {
  const database = await getDB();
  return await database.count(STORE_NAME);
}

export async function incrementRetry(id: string): Promise<void> {
  const database = await getDB();
  const tx = database.transaction(STORE_NAME, 'readwrite');
  const store = tx.store;

  const checkin = await store.get(id);
  if (!checkin) {
    throw new Error(`Checkin with id ${id} not found`);
  }

  checkin.retryCount += 1;
  await store.put(checkin);
}

export async function cleanExpiredItems(): Promise<number> {
  return await pruneOldItems();
}
