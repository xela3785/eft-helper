export type RequirementProgressMap = Record<string, number>;
export type ProgressModules = Record<string, ModuleProgress>;

export interface ModuleProgress {
  currentLevel: number;
  levelProgress: Record<string, RequirementProgressMap>;
  updatedAt: number;
}

export interface ProgressSnapshot {
  modules: ProgressModules;
  updatedAt: number | null;
}
