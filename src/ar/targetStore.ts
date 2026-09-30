import { appConfig } from '../config/appConfig';
import { assetUrl } from '../utils/assets';

/**
 * Optional custom marker target compiled in-browser by the instructor.
 * Stored in IndexedDB on this device only (never uploaded).
 */
const DB_NAME = 'dnb-ar-trainer';
const STORE = 'targets';
const KEY = 'custom';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function getCustomTarget(): Promise<ArrayBuffer | null> {
  if (typeof indexedDB === 'undefined') return null;
  try {
    const v = await tx<ArrayBuffer | undefined>('readonly', (s) => s.get(KEY) as IDBRequest<ArrayBuffer | undefined>);
    return v ?? null;
  } catch {
    return null;
  }
}

export async function setCustomTarget(buffer: ArrayBuffer): Promise<void> {
  await tx('readwrite', (s) => s.put(buffer, KEY));
}

export async function clearCustomTarget(): Promise<void> {
  await tx('readwrite', (s) => s.delete(KEY));
}

export class TargetLoadError extends Error {}

/** Load the custom target if one is stored, otherwise the bundled one. */
export async function loadTargetBuffer(): Promise<{ buffer: ArrayBuffer; custom: boolean }> {
  const custom = await getCustomTarget();
  if (custom) return { buffer: custom, custom: true };
  let res: Response;
  try {
    res = await fetch(assetUrl(appConfig.markerTargetUrl), { cache: 'no-cache' });
  } catch (err) {
    throw new TargetLoadError(`Network error loading marker target: ${(err as Error).message}`);
  }
  const type = res.headers.get('content-type') ?? '';
  // Dev servers answer unknown paths with index.html; treat that as missing.
  if (!res.ok || type.includes('text/html')) {
    throw new TargetLoadError(`Marker target not found at ${appConfig.markerTargetUrl}`);
  }
  return { buffer: await res.arrayBuffer(), custom: false };
}
