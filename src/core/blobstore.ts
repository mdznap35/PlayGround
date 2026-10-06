/* BlobStore: large binary payloads (drawings, future voice packs, photos)
   live in IndexedDB via Dexie — localStorage stays small and fast for the
   hot save slot. Contract:
   - put/get/delete by string key, values are Blob | ArrayBuffer | string.
   - MemoryStore fallback when IndexedDB is unavailable (private mode/tests):
     same async API, data is session-scoped and callers must not care.
   - DB name 'nova-blobs', version 1, single 'blobs' table (key-path 'key').
   - Migration rule: v+1 must add stores, never rename 'blobs'.
   WHY dexie: tiny typed wrapper, versioned schema API, works with the SW
   cache model (blobs are app data, not HTTP cache).
   WHAT IT REPLACES: the ad-hoc `nova.lastDrawing` localStorage data-URL hack
   can move here when convenient — localStorage saves are NOT touched. */

import Dexie, { type Table } from 'dexie';

export type BlobValue = Blob | ArrayBuffer | string;

interface BlobRow { key: string; value: BlobValue; updatedAt: number }

export interface BlobStoreApi {
  put(key: string, value: BlobValue): Promise<void>;
  get(key: string): Promise<BlobValue | undefined>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
  readonly backend: 'dexie' | 'memory';
}

class DexieBlobStore implements BlobStoreApi {
  readonly backend = 'dexie' as const;
  private db: Dexie & { blobs: Table<BlobRow, string> };

  constructor() {
    const db = new Dexie('nova-blobs') as Dexie & { blobs: Table<BlobRow, string> };
    db.version(1).stores({ blobs: 'key' });
    this.db = db;
  }

  async put(key: string, value: BlobValue): Promise<void> {
    await this.db.blobs.put({ key, value, updatedAt: Date.now() });
  }
  async get(key: string): Promise<BlobValue | undefined> {
    return (await this.db.blobs.get(key))?.value;
  }
  async delete(key: string): Promise<void> {
    await this.db.blobs.delete(key);
  }
  async keys(): Promise<string[]> {
    return (await this.db.blobs.toCollection().primaryKeys()) as string[];
  }
}

class MemoryBlobStore implements BlobStoreApi {
  readonly backend = 'memory' as const;
  private map = new Map<string, BlobValue>();
  async put(key: string, value: BlobValue): Promise<void> { this.map.set(key, value); }
  async get(key: string): Promise<BlobValue | undefined> { return this.map.get(key); }
  async delete(key: string): Promise<void> { this.map.delete(key); }
  async keys(): Promise<string[]> { return [...this.map.keys()]; }
}

function indexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

/** Preferred store; falls back to memory when IndexedDB is missing/broken. */
export async function openBlobStore(): Promise<BlobStoreApi> {
  if (!indexedDBAvailable()) return new MemoryBlobStore();
  try {
    const s = new DexieBlobStore();
    await s.keys(); // probe: throws in broken/private environments
    return s;
  } catch {
    return new MemoryBlobStore();
  }
}

export { DexieBlobStore, MemoryBlobStore };
