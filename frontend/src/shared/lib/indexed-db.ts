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

export async function readProgressSnapshot(): Promise<ProgressSnapshot> {
  const database = await dbPromise;
  const snapshot = await database.get(STORE_NAME, GUEST_PROGRESS_KEY);

  return (
    snapshot ?? {
      modules: {},
      updatedAt: null,
    }
  );
}

export async function writeProgressSnapshot(snapshot: ProgressSnapshot) {
  const database = await dbPromise;
  await database.put(STORE_NAME, snapshot, GUEST_PROGRESS_KEY);
}
