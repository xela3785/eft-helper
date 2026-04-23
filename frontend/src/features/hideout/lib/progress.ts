import type {
  HideoutModule,
  HideoutModuleLevel,
  RequirementHideoutStationLevel,
  RequirementItem,
} from '../../../entities/module/types';
import type { ModuleProgress, ProgressModules } from '../model/types';

export const numberFormatter = new Intl.NumberFormat('ru-RU');
export const STASH_MODULE_ID = '5d484fc0654e76006657e0ab';
export const STASH_FIXED_LEVEL = 4;

function getForcedModuleLevel(moduleId: string) {
  return moduleId === STASH_MODULE_ID ? STASH_FIXED_LEVEL : null;
}

export function getTrackedModuleLevel(progressModules: ProgressModules, moduleId: string) {
  return getForcedModuleLevel(moduleId) ?? progressModules[moduleId]?.currentLevel ?? 0;
}

export function getRequirementTotal(requirement: RequirementItem) {
  if (requirement.item.id === '5449016a4bdc2d6f028b456f') {
    return 1;
  }

  return requirement.count ?? requirement.quantity ?? 0;
}

export function getRequirementFillAmount(requirement: RequirementItem) {
  return requirement.count ?? requirement.quantity ?? 0;
}

export function getRequirementCollected(
  progress: ModuleProgress | undefined,
  levelId: string,
  requirementId: string,
) {
  return progress?.levelProgress[levelId]?.[requirementId] ?? 0;
}

function getStoredLevel(module: HideoutModule, progress?: ModuleProgress) {
  const fallbackLevel = module.levels[0];
  const maxLevel = module.levels.at(-1)?.level ?? fallbackLevel.level;
  const forcedLevel = getForcedModuleLevel(module.id);

  if (forcedLevel !== null) {
    return Math.max(0, Math.min(forcedLevel, maxLevel));
  }

  return Math.max(0, Math.min(progress?.currentLevel ?? 0, maxLevel));
}

export function getLevelProgressSummary(level: HideoutModuleLevel, progress?: ModuleProgress) {
  const totalRequired = level.itemRequirements.reduce(
    (total, requirement) => total + getRequirementTotal(requirement),
    0,
  );

  const collectedRequired = level.itemRequirements.reduce((total, requirement) => {
    const collected = getRequirementCollected(progress, level.id, requirement.id);
    return total + Math.min(collected, getRequirementTotal(requirement));
  }, 0);

  const completionPercent = totalRequired === 0 ? 100 : Math.round((collectedRequired / totalRequired) * 100);

  return {
    totalRequired,
    collectedRequired,
    completionPercent,
  };
}

export function getVisibleStationLevelRequirements(
  module: HideoutModule,
  level: HideoutModuleLevel,
) {
  return (level.stationLevelRequirements ?? []).filter(
    (requirement) => requirement.station.id !== module.id,
  );
}

export function isStationRequirementMet(
  requirement: RequirementHideoutStationLevel,
  progressModules: ProgressModules,
) {
  return getTrackedModuleLevel(progressModules, requirement.station.id) >= requirement.level;
}

export function getStationRequirementsSummary(
  module: HideoutModule,
  level: HideoutModuleLevel | null,
  progressModules: ProgressModules,
) {
  const visibleRequirements = level
    ? getVisibleStationLevelRequirements(module, level)
    : [];
  const metRequirements = visibleRequirements.filter((requirement) =>
    isStationRequirementMet(requirement, progressModules),
  );

  return {
    visibleRequirements,
    totalRequirements: visibleRequirements.length,
    metRequirements: metRequirements.length,
    blockedRequirements: visibleRequirements.filter(
      (requirement) => !isStationRequirementMet(requirement, progressModules),
    ),
    allMet: visibleRequirements.length === metRequirements.length,
  };
}

export function getModuleProgressSummary(module: HideoutModule, progress?: ModuleProgress) {
  const fallbackLevel = module.levels[0];
  const currentLevelNumber = getStoredLevel(module, progress);
  const maxLevel = module.levels.at(-1)?.level ?? fallbackLevel.level;
  const isMaxLevel = currentLevelNumber >= maxLevel;
  const currentLevel =
    module.levels.find((level) => level.level === currentLevelNumber) ?? null;
  const nextLevel = isMaxLevel
    ? null
    : module.levels.find((level) => level.level === currentLevelNumber + 1) ?? fallbackLevel;
  const levelSummary = nextLevel
    ? getLevelProgressSummary(nextLevel, progress)
    : {
        totalRequired: 0,
        collectedRequired: 0,
        completionPercent: 100,
      };

  return {
    currentLevel,
    currentLevelNumber,
    nextLevel,
    maxLevel,
    isMaxLevel,
    isMinLevel: currentLevelNumber <= 0,
    isLevelLocked: getForcedModuleLevel(module.id) !== null,
    ...levelSummary,
  };
}

export function getModuleBuildAvailabilitySummary(
  module: HideoutModule,
  progress: ModuleProgress | undefined,
  progressModules: ProgressModules,
) {
  const moduleSummary = getModuleProgressSummary(module, progress);
  const stationRequirements = getStationRequirementsSummary(
    module,
    moduleSummary.nextLevel,
    progressModules,
  );
  const itemRequirementsMet =
    moduleSummary.totalRequired === 0 ||
    moduleSummary.collectedRequired >= moduleSummary.totalRequired;
  const canBuild =
    Boolean(moduleSummary.nextLevel) && itemRequirementsMet && stationRequirements.allMet;
  const blockedByStationRequirements =
    Boolean(moduleSummary.nextLevel) && stationRequirements.blockedRequirements.length > 0;

  return {
    ...moduleSummary,
    stationRequirements,
    itemRequirementsMet,
    canBuild,
    blockedByStationRequirements,
  };
}

export function getModuleBuildSortOrder(
  module: HideoutModule,
  progress: ModuleProgress | undefined,
  progressModules: ProgressModules,
) {
  const summary = getModuleBuildAvailabilitySummary(module, progress, progressModules);

  if (summary.isMaxLevel) {
    return 2;
  }

  if (summary.blockedByStationRequirements) {
    return 1;
  }

  return 0;
}

export function formatConstructionTime(totalSeconds: number) {
  if (totalSeconds <= 0) {
    return 'Мгновенно';
  }

  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days} дн.`);
  }

  if (hours > 0) {
    parts.push(`${hours} ч.`);
  }

  if (minutes > 0) {
    parts.push(`${minutes} мин.`);
  }

  return parts.join(' ');
}

export function getModuleInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
