import { openDB } from 'idb';
import type { ProgressSnapshot } from '../../features/hideout/model/types';

const DATABASE_NAME = 'eft-helper-db';
const DATABASE_VERSION = 1;
const STORE_NAME = 'progress';
const GUEST_PROGRESS_KEY = 'guest-progress';

const dbPromise = openDB(DATABASE_NAME, DATABASE_VERSION, {
  upgrade(database) {
    if (!database.objectStoreNames.contains(STORE_NAME)) {
      database.createObjectStore(STORE_NAME);
    }
  },
});

export function getProgressStorageKey(userId?: number | null) {
  return userId ? `user-progress-${userId}` : GUEST_PROGRESS_KEY;
}

export async function readProgressSnapshot(storageKey = GUEST_PROGRESS_KEY): Promise<ProgressSnapshot> {
  const database = await dbPromise;
  const snapshot = await database.get(STORE_NAME, storageKey);

  return (
    snapshot ?? {
      modules: {},
      updatedAt: null,
    }
  );
}

export async function writeProgressSnapshot(snapshot: ProgressSnapshot, storageKey = GUEST_PROGRESS_KEY) {
  const database = await dbPromise;
  await database.put(STORE_NAME, snapshot, storageKey);
}
