import { create } from 'zustand';
import { useAuthStore } from '../../../features/auth/model/auth-store';
import {
  getProgressStorageKey,
  readProgressSnapshot,
  writeProgressSnapshot,
} from '../../../shared/lib/indexed-db';
import {
  getHideoutProgress,
  syncHideoutProgress,
  type SyncModuleProgressDto,
} from '../api/progress-api';
import { STASH_FIXED_LEVEL, STASH_MODULE_ID } from '../lib/progress';
import type { ModuleProgress, ProgressModules } from './types';

interface HideoutProgressState {
  modules: ProgressModules;
  isHydrated: boolean;
  lastSyncedAt: number | null;
  initializeProgress: () => Promise<void>;
  incrementItem: (
    moduleId: string,
    levelId: string,
    requirementId: string,
    maxCount: number,
    itemId: string,
  ) => Promise<void>;
  decrementItem: (moduleId: string, levelId: string, requirementId: string, itemId: string) => Promise<void>;
  fillLevelRequirements: (
    moduleId: string,
    levelId: string,
    requirements: Array<{ requirementId: string; maxCount: number; itemId: string }>,
  ) => Promise<void>;
  upgradeModule: (moduleId: string, nextLevel: number, maxLevel: number) => Promise<void>;
  downgradeModule: (moduleId: string, prevLevel: number, minLevel: number) => Promise<void>;
}

const ROUBLES_ITEM_ID = '5449016a4bdc2d6f028b456f';
const SERVER_FALLBACK_LEVEL_ID = '__server__';
type ServerLevelProgressEntry = { item_id: string; count: number; level_id?: string };

function getFixedModuleLevel(moduleId: string) {
  return moduleId === STASH_MODULE_ID ? STASH_FIXED_LEVEL : null;
}

function getNormalizedModuleLevel(moduleId: string, level: number | undefined) {
  const fixedLevel = getFixedModuleLevel(moduleId);

  if (fixedLevel !== null) {
    return fixedLevel;
  }

  return Math.max(0, level ?? 0);
}

function createEmptyModuleProgress(moduleId: string): ModuleProgress {
  return {
    currentLevel: getNormalizedModuleLevel(moduleId, 0),
    levelProgress: {},
    updatedAt: Date.now(),
  };
}

function normalizeProgressModules(modules: ProgressModules): ProgressModules {
  return Object.fromEntries(
    Object.entries(modules).map(([moduleId, moduleProgress]) => [
      moduleId,
      {
        ...moduleProgress,
        currentLevel: getNormalizedModuleLevel(moduleId, moduleProgress.currentLevel),
      },
    ]),
  );
}

function hasProgressModules(modules: ProgressModules) {
  return Object.keys(modules).length > 0;
}

function getLatestModuleUpdatedAt(modules: ProgressModules, fallback: number | null) {
  return (
    Object.values(modules).reduce<number | null>((latestTimestamp, moduleProgress) => {
      if (latestTimestamp === null) {
        return moduleProgress.updatedAt;
      }

      return Math.max(latestTimestamp, moduleProgress.updatedAt);
    }, null) ?? fallback
  );
}

function parseServerUpdatedAt(value: string | undefined) {
  if (!value) {
    return Date.now();
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? Date.now() : timestamp;
}

function toLevelProgressEntries(
  levelProgress:
    | SyncModuleProgressDto['progress']['level_progress']
    | Record<string, number>
    | undefined,
): ServerLevelProgressEntry[] {
  if (!levelProgress) {
    return [];
  }

  if (Array.isArray(levelProgress)) {
    return levelProgress;
  }

  if (typeof levelProgress === 'object' && levelProgress !== null) {
    const maybeEntry = levelProgress as Partial<ServerLevelProgressEntry>;

    if (typeof maybeEntry.item_id === 'string' && typeof maybeEntry.count === 'number') {
      return [
        {
          item_id: maybeEntry.item_id,
          count: maybeEntry.count,
          ...(typeof maybeEntry.level_id === 'string' ? { level_id: maybeEntry.level_id } : {}),
        },
      ];
    }
  }

  if (typeof levelProgress !== 'object') {
    return [];
  }

  return Object.entries(levelProgress as Record<string, unknown>).map(([itemId, count]) => ({
    item_id: itemId,
    count: typeof count === 'number' ? count : 0,
  }));
}

function deserializeServerModules(payload: SyncModuleProgressDto[]): ProgressModules {
  return payload.reduce<ProgressModules>((accumulator, moduleEntry) => {
    const moduleId = moduleEntry.module_id;

    if (!moduleId) {
      return accumulator;
    }

    const levelProgress = toLevelProgressEntries(moduleEntry.progress.level_progress).reduce<
      ModuleProgress['levelProgress']
    >((levelAccumulator, itemEntry) => {
      const requirementId = itemEntry.item_id;

      if (!requirementId) {
        return levelAccumulator;
      }

      const levelId = itemEntry.level_id ?? SERVER_FALLBACK_LEVEL_ID;
      const levelRequirementProgress = {
        ...(levelAccumulator[levelId] ?? {}),
        [requirementId]: Math.max(0, itemEntry.count ?? 0),
      };

      return {
        ...levelAccumulator,
        [levelId]: levelRequirementProgress,
      };
    }, {});

    return {
      ...accumulator,
      [moduleId]: {
        currentLevel: getNormalizedModuleLevel(moduleId, moduleEntry.progress.current_level),
        levelProgress,
        updatedAt: parseServerUpdatedAt(moduleEntry.progress.updated_at),
      },
    };
  }, {});
}

function serializeServerModules(modules: ProgressModules): SyncModuleProgressDto[] {
  return Object.entries(modules).map(([moduleId, moduleProgress]) => {
    const levelProgress = Object.entries(moduleProgress.levelProgress).flatMap(([levelId, requirements]) =>
      Object.entries(requirements).map(([requirementId, count]) => ({
        item_id: requirementId,
        count,
        ...(levelId === SERVER_FALLBACK_LEVEL_ID ? {} : { level_id: levelId }),
      })),
    );

    return {
      module_id: moduleId,
      progress: {
        current_level: moduleProgress.currentLevel,
        level_progress: levelProgress,
        updated_at: new Date(moduleProgress.updatedAt).toISOString(),
      },
    };
  });
}

async function persistSnapshot(modules: ProgressModules, updatedAt: number) {
  const userId = useAuthStore.getState().user?.id ?? null;
  const storageKey = getProgressStorageKey(userId);
  await writeProgressSnapshot({ modules, updatedAt }, storageKey);
}

async function syncSnapshot(modules: ProgressModules) {
  const userId = useAuthStore.getState().user?.id ?? null;

  if (!userId) {
    return;
  }

  await syncHideoutProgress(serializeServerModules(modules));
}

function getModuleProgress(modules: ProgressModules, moduleId: string): ModuleProgress {
  return modules[moduleId] ?? createEmptyModuleProgress(moduleId);
}

export const useHideoutProgressStore = create<HideoutProgressState>((set) => ({
  modules: {},
  isHydrated: false,
  lastSyncedAt: null,
  initializeProgress: async () => {
    const userId = useAuthStore.getState().user?.id ?? null;
    const storageKey = getProgressStorageKey(userId);
    const userSnapshot = await readProgressSnapshot(storageKey);

    if (!userId) {
      const normalizedModules = normalizeProgressModules(userSnapshot.modules);
      set({
        modules: normalizedModules,
        isHydrated: true,
        lastSyncedAt: userSnapshot.updatedAt,
      });
      return;
    }

    const guestSnapshot = await readProgressSnapshot(getProgressStorageKey(null));
    const localSnapshot =
      hasProgressModules(userSnapshot.modules) || !hasProgressModules(guestSnapshot.modules)
        ? userSnapshot
        : guestSnapshot;
    const normalizedLocalModules = normalizeProgressModules(localSnapshot.modules);

    try {
      const serverProgress = await getHideoutProgress();
      const serverModules = normalizeProgressModules(deserializeServerModules(serverProgress));
      const isServerEmpty = !hasProgressModules(serverModules);
      const hasLocalProgress = hasProgressModules(normalizedLocalModules);

      if (isServerEmpty && hasLocalProgress) {
        await syncHideoutProgress(serializeServerModules(normalizedLocalModules));
        const localLastSyncedAt = getLatestModuleUpdatedAt(normalizedLocalModules, localSnapshot.updatedAt);

        await writeProgressSnapshot(
          { modules: normalizedLocalModules, updatedAt: localLastSyncedAt },
          storageKey,
        );

        set({
          modules: normalizedLocalModules,
          isHydrated: true,
          lastSyncedAt: localLastSyncedAt,
        });
        return;
      }

      const lastSyncedAt = getLatestModuleUpdatedAt(serverModules, localSnapshot.updatedAt);

      await writeProgressSnapshot({ modules: serverModules, updatedAt: lastSyncedAt }, storageKey);

      set({
        modules: serverModules,
        isHydrated: true,
        lastSyncedAt,
      });
    } catch {
      set({
        modules: normalizedLocalModules,
        isHydrated: true,
        lastSyncedAt: localSnapshot.updatedAt,
      });
    }
  },
  incrementItem: async (moduleId, levelId, requirementId, maxCount, itemId) => {
    let nextModules: ProgressModules = {};
    const savedAt = Date.now();

    set((state) => {
      const currentModule = getModuleProgress(state.modules, moduleId);
      const levelProgress = { ...currentModule.levelProgress[levelId] };
      let nextValue: number;

      if (itemId === ROUBLES_ITEM_ID) {
        nextValue = Math.min(maxCount, maxCount);
      } else {
        nextValue = Math.min(maxCount, (levelProgress[requirementId] ?? 0) + 1);
      }

      levelProgress[requirementId] = nextValue;
      nextModules = {
        ...state.modules,
        [moduleId]: {
          ...currentModule,
          levelProgress: {
            ...currentModule.levelProgress,
            [levelId]: levelProgress,
          },
          updatedAt: savedAt,
        },
      };

      return {
        modules: nextModules,
        lastSyncedAt: savedAt,
      };
    });

    await persistSnapshot(nextModules, savedAt);
    await syncSnapshot(nextModules);
  },
  decrementItem: async (moduleId, levelId, requirementId, itemId) => {
    let nextModules: ProgressModules = {};
    const savedAt = Date.now();

    set((state) => {
      const currentModule = getModuleProgress(state.modules, moduleId);
      const levelProgress = { ...currentModule.levelProgress[levelId] };
      let nextValue: number;

      if (itemId === ROUBLES_ITEM_ID) {
        nextValue = 0;
      } else {
        nextValue = Math.max(0, (levelProgress[requirementId] ?? 0) - 1);
      }

      levelProgress[requirementId] = nextValue;
      nextModules = {
        ...state.modules,
        [moduleId]: {
          ...currentModule,
          levelProgress: {
            ...currentModule.levelProgress,
            [levelId]: levelProgress,
          },
          updatedAt: savedAt,
        },
      };

      return {
        modules: nextModules,
        lastSyncedAt: savedAt,
      };
    });

    await persistSnapshot(nextModules, savedAt);
    await syncSnapshot(nextModules);
  },
  fillLevelRequirements: async (moduleId, levelId, requirements) => {
    let nextModules: ProgressModules = {};
    const savedAt = Date.now();

    set((state) => {
      const currentModule = getModuleProgress(state.modules, moduleId);
      const levelProgress = { ...currentModule.levelProgress[levelId] };

      requirements.forEach((requirement) => {
        levelProgress[requirement.requirementId] =
          requirement.itemId === ROUBLES_ITEM_ID
            ? requirement.maxCount
            : requirement.maxCount;
      });

      nextModules = {
        ...state.modules,
        [moduleId]: {
          ...currentModule,
          levelProgress: {
            ...currentModule.levelProgress,
            [levelId]: levelProgress,
          },
          updatedAt: savedAt,
        },
      };

      return {
        modules: nextModules,
        lastSyncedAt: savedAt,
      };
    });

    await persistSnapshot(nextModules, savedAt);
    await syncSnapshot(nextModules);
  },
  upgradeModule: async (moduleId, nextLevel, maxLevel) => {
    let nextModules: ProgressModules = {};
    const savedAt = Date.now();

    set((state) => {
      const currentModule = getModuleProgress(state.modules, moduleId);
      const safeLevel = Math.max(1, Math.min(nextLevel, maxLevel));

      nextModules = {
        ...state.modules,
        [moduleId]: {
          ...currentModule,
          currentLevel: getNormalizedModuleLevel(moduleId, safeLevel),
          updatedAt: savedAt,
        },
      };

      return {
        modules: nextModules,
        lastSyncedAt: savedAt,
      };
    });

    await persistSnapshot(nextModules, savedAt);
    await syncSnapshot(nextModules);
  },
  downgradeModule: async (moduleId, prevLevel, minLevel) => {
    let prevModules: ProgressModules = {};
    const savedAt = Date.now();

    set((state) => {
      const currentModule = getModuleProgress(state.modules, moduleId);
      const safeLevel = Math.max(minLevel, prevLevel);

      prevModules = {
        ...state.modules,
        [moduleId]: {
          ...currentModule,
          currentLevel: getNormalizedModuleLevel(moduleId, safeLevel),
          updatedAt: savedAt,
        },
      };

      return {
        modules: prevModules,
        lastSyncedAt: savedAt,
      };
    });

    await persistSnapshot(prevModules, savedAt);
    await syncSnapshot(prevModules);
  },
}));
