import { Injectable, signal } from '@angular/core';

export interface CalculationHistoryEntry {
  id: string;
  expression: string;
  result: string;
  /** ISO 8601 UTC timestamp; render it through `Date` so it adjusts to the viewer's local timezone. */
  timestamp: string;
}

const DATABASE_NAME = 'calcora';
const DATABASE_VERSION = 1;
const HISTORY_STORE_NAME = 'history';

@Injectable({
  providedIn: 'root',
})
export class CalculationHistory {
  private readonly entriesSignal = signal<CalculationHistoryEntry[]>([]);
  readonly entries = this.entriesSignal.asReadonly();

  private readonly databaseReady: Promise<IDBDatabase | null> = this.initializeDatabase();

  async recordCalculation(expression: string, result: string): Promise<void> {
    const entry: CalculationHistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      expression,
      result,
      timestamp: new Date().toISOString(),
    };

    const database = await this.databaseReady;

    if (database) {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(HISTORY_STORE_NAME, 'readwrite');
        transaction.objectStore(HISTORY_STORE_NAME).add(entry);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    }

    this.entriesSignal.update((currentEntries) => [entry, ...currentEntries]);
  }

  private async initializeDatabase(): Promise<IDBDatabase | null> {
    if (typeof indexedDB === 'undefined') {
      return null;
    }

    const database = await this.openDatabase();
    this.loadAllEntries(database);
    return database;
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const openRequest = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

      openRequest.onupgradeneeded = () => {
        const database = openRequest.result;
        if (!database.objectStoreNames.contains(HISTORY_STORE_NAME)) {
          const store = database.createObjectStore(HISTORY_STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp');
        }
      };

      openRequest.onsuccess = () => resolve(openRequest.result);
      openRequest.onerror = () => reject(openRequest.error);
    });
  }

  private loadAllEntries(database: IDBDatabase): void {
    const transaction = database.transaction(HISTORY_STORE_NAME, 'readonly');
    const cursorRequest = transaction.objectStore(HISTORY_STORE_NAME).index('timestamp').openCursor(null, 'prev');
    const loadedEntries: CalculationHistoryEntry[] = [];

    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (cursor) {
        loadedEntries.push(cursor.value as CalculationHistoryEntry);
        cursor.continue();
      } else {
        this.entriesSignal.set(loadedEntries);
      }
    };
  }
}
