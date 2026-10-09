/** Thin localStorage wrapper with versioned keys and quota error reporting. */
export const STORAGE_PREFIX = 'wq.v1.';

export class StorageFullError extends Error {
  constructor() {
    super('storage full');
    this.name = 'StorageFullError';
  }
}

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
      throw new StorageFullError();
    }
    throw e;
  }
}

export function removeKey(key: string): void {
  localStorage.removeItem(STORAGE_PREFIX + key);
}
