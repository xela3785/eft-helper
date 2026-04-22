import { create } from 'zustand';
import { readProgressSnapshot, writeProgressSnapshot } from '../../../shared/lib/indexed-db';
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

function getModuleProgress(modules: ProgressModules, moduleId: string): ModuleProgress {
  return modules[moduleId] ?? createEmptyModuleProgress(moduleId);
}

export const useHideoutProgressStore = create<HideoutProgressState>((set) => ({
  modules: {},
  isHydrated: false,
  lastSyncedAt: null,
  initializeProgress: async () => {
    const snapshot = await readProgressSnapshot();
    const normalizedModules = Object.fromEntries(
      Object.entries(snapshot.modules).map(([moduleId, moduleProgress]) => [
        moduleId,
        {
          ...moduleProgress,
          currentLevel: getNormalizedModuleLevel(moduleId, moduleProgress.currentLevel),
        },
      ]),
    );

    set({
      modules: normalizedModules,
      isHydrated: true,
      lastSyncedAt: snapshot.updatedAt,
    });
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

    await writeProgressSnapshot({ modules: nextModules, updatedAt: savedAt });
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

    await writeProgressSnapshot({ modules: nextModules, updatedAt: savedAt });
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

    await writeProgressSnapshot({ modules: nextModules, updatedAt: savedAt });
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

    await writeProgressSnapshot({ modules: nextModules, updatedAt: savedAt });
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

    await writeProgressSnapshot({ modules: prevModules, updatedAt: savedAt });
  },
}));
