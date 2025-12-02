/**
 * Vitest Setup for Kiosk Tests
 *
 * Sets up fake-indexeddb for testing IndexedDB-based offline queue
 */
import FDBFactory from 'fake-indexeddb/lib/FDBFactory';
import FDBKeyRange from 'fake-indexeddb/lib/FDBKeyRange';
import FDBRequest from 'fake-indexeddb/lib/FDBRequest';
import FDBOpenDBRequest from 'fake-indexeddb/lib/FDBOpenDBRequest';
import FDBDatabase from 'fake-indexeddb/lib/FDBDatabase';
import FDBTransaction from 'fake-indexeddb/lib/FDBTransaction';
import FDBObjectStore from 'fake-indexeddb/lib/FDBObjectStore';
import FDBIndex from 'fake-indexeddb/lib/FDBIndex';
import FDBCursor from 'fake-indexeddb/lib/FDBCursor';
import FDBCursorWithValue from 'fake-indexeddb/lib/FDBCursorWithValue';
import FDBVersionChangeEvent from 'fake-indexeddb/lib/FDBVersionChangeEvent';

// Set up fake-indexeddb globals before any tests run
globalThis.indexedDB = new FDBFactory();
globalThis.IDBKeyRange = FDBKeyRange;
globalThis.IDBRequest = FDBRequest;
globalThis.IDBOpenDBRequest = FDBOpenDBRequest;
globalThis.IDBDatabase = FDBDatabase;
globalThis.IDBTransaction = FDBTransaction;
globalThis.IDBObjectStore = FDBObjectStore;
globalThis.IDBIndex = FDBIndex;
globalThis.IDBCursor = FDBCursor;
globalThis.IDBCursorWithValue = FDBCursorWithValue;
globalThis.IDBVersionChangeEvent = FDBVersionChangeEvent;

// Mock localStorage for sequence counter persistence
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
});

// Reset localStorage before each test
beforeEach(() => {
  localStorage.clear();
});
