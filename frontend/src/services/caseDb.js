/**
 * VECNA-Pulse Persistent On-Device Investigation Case Store (IndexedDB)
 * Persists triage dossiers, audio telemetry, and officer notes locally on the investigator's device.
 */

const DB_NAME = 'vecna_cases_db';
const DB_VERSION = 1;
const STORE_NAME = 'cases';

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      return reject(new Error('IndexedDB not supported in this browser environment.'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'call_id' });
        store.createIndex('timestamp_ms', 'timestamp_ms', { unique: false });
        store.createIndex('urgency_score', 'urgency_score', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

/**
 * Save an investigation case dossier to IndexedDB
 */
export async function saveCaseToDevice(casePayload) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const item = {
      ...casePayload,
      saved_at_ms: Date.now(),
    };
    const req = store.put(item);
    req.onsuccess = () => resolve(item);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Get all saved cases sorted by timestamp descending
 */
export async function getAllSavedCases() {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const cases = req.result || [];
        cases.sort((a, b) => (b.timestamp_ms || 0) - (a.timestamp_ms || 0));
        resolve(cases);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    return [];
  }
}

/**
 * Delete a case by call_id
 */
export async function deleteSavedCase(callId) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(callId);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Count total saved cases
 */
export async function getSavedCaseCount() {
  try {
    const cases = await getAllSavedCases();
    return cases.length;
  } catch (e) {
    return 0;
  }
}
