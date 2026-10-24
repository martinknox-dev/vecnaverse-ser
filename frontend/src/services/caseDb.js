/**
 * VECNA-Pulse Crash-Proof Persistent Storage Manager
 * Uses IndexedDB with automatic LocalStorage & Cookie fallbacks.
 * Guaranteed zero crashes even in restricted or private browsing modes.
 */

const DB_NAME = 'vecna_cases_db';
const DB_VERSION = 2;
const STORE_CASES = 'cases';
const STORE_MODELS = 'models';

// In-memory fallback if all browser storage fails
const memoryCaseStore = new Map();

/**
 * Cookie helper for persistence backup
 */
export function setCookie(name, value, days = 365) {
  try {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  } catch (e) {}
}

export function getCookie(name) {
  try {
    const match = document.cookie.match(new RegExp('(^| )' + encodeURIComponent(name) + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  } catch (e) {
    return null;
  }
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      return reject(new Error('IndexedDB not supported'));
    }

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_CASES)) {
          const store = db.createObjectStore(STORE_CASES, { keyPath: 'call_id' });
          store.createIndex('timestamp_ms', 'timestamp_ms', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_MODELS)) {
          db.createObjectStore(STORE_MODELS, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error || new Error('Failed to open IndexedDB'));
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Save an investigation case dossier with zero-crash fallback
 */
export async function saveCaseToDevice(casePayload) {
  if (!casePayload || !casePayload.call_id) return null;

  const item = {
    ...casePayload,
    saved_at_ms: Date.now(),
  };

  // Set persistence cookie & localStorage as backup
  setCookie('vecna_last_saved_case', item.call_id, 30);
  try {
    const rawLocal = localStorage.getItem('vecna_saved_cases_backup');
    const list = rawLocal ? JSON.parse(rawLocal) : [];
    const filtered = list.filter((c) => c.call_id !== item.call_id);
    filtered.unshift(item);
    // Keep max 20 in localStorage to avoid quota limits
    localStorage.setItem('vecna_saved_cases_backup', JSON.stringify(filtered.slice(0, 20)));
  } catch (e) {}

  // Primary: IndexedDB
  try {
    const db = await openDatabase();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CASES, 'readwrite');
      const store = tx.objectStore(STORE_CASES);
      const req = store.put(item);
      req.onsuccess = () => resolve(item);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    // Graceful fallback to memory store
    memoryCaseStore.set(item.call_id, item);
  }

  return item;
}

/**
 * Get all saved cases sorted by timestamp descending
 */
export async function getAllSavedCases() {
  // Try IndexedDB first
  try {
    const db = await openDatabase();
    const cases = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CASES, 'readonly');
      const store = tx.objectStore(STORE_CASES);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    if (cases && cases.length > 0) {
      cases.sort((a, b) => (b.timestamp_ms || 0) - (a.timestamp_ms || 0));
      return cases;
    }
  } catch (e) {}

  // Fallback to localStorage backup
  try {
    const rawLocal = localStorage.getItem('vecna_saved_cases_backup');
    if (rawLocal) {
      const list = JSON.parse(rawLocal);
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch (e) {}

  // Fallback to in-memory store
  return Array.from(memoryCaseStore.values()).sort(
    (a, b) => (b.timestamp_ms || 0) - (a.timestamp_ms || 0)
  );
}

/**
 * Delete a case by call_id with zero crashes
 */
export async function deleteSavedCase(callId) {
  memoryCaseStore.delete(callId);

  try {
    const rawLocal = localStorage.getItem('vecna_saved_cases_backup');
    if (rawLocal) {
      const list = JSON.parse(rawLocal);
      const filtered = list.filter((c) => c.call_id !== callId);
      localStorage.setItem('vecna_saved_cases_backup', JSON.stringify(filtered));
    }
  } catch (e) {}

  try {
    const db = await openDatabase();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CASES, 'readwrite');
      const store = tx.objectStore(STORE_CASES);
      const req = store.delete(callId);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
    return true;
  } catch (e) {
    return true;
  }
}

/**
 * Save model file info to local database
 */
export async function saveModelMetaToDevice(modelInfo) {
  try {
    const db = await openDatabase();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_MODELS, 'readwrite');
      const store = tx.objectStore(STORE_MODELS);
      const req = store.put(modelInfo);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {}
}

export async function getInstalledModels() {
  try {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_MODELS, 'readonly');
      const store = tx.objectStore(STORE_MODELS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    return [];
  }
}
