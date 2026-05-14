import { apiClient } from '../../../shared/api/client';

interface SyncLevelProgressEntryDto {
  item_id: string;
  count: number;
  level_id?: string;
}

export interface SyncModuleProgressDto {
  module_id: string;
  progress: {
    current_level: number;
    level_progress?: SyncLevelProgressEntryDto[] | SyncLevelProgressEntryDto | null;
    updated_at?: string;
  };
}

interface SyncEnvelopeDto {
  modules?: SyncModuleProgressDto[];
  progress?: SyncModuleProgressDto[];
  data?: SyncModuleProgressDto[];
}

function isSyncModuleProgressArray(value: unknown): value is SyncModuleProgressDto[] {
  return Array.isArray(value);
}

function extractProgressPayload(value: unknown): SyncModuleProgressDto[] {
  if (isSyncModuleProgressArray(value)) {
    return value;
  }

  if (typeof value !== 'object' || value === null) {
    return [];
  }

  const envelope = value as SyncEnvelopeDto;

  if (isSyncModuleProgressArray(envelope.modules)) {
    return envelope.modules;
  }

  if (isSyncModuleProgressArray(envelope.progress)) {
    return envelope.progress;
  }

  if (isSyncModuleProgressArray(envelope.data)) {
    return envelope.data;
  }

  return [];
}

export async function getHideoutProgress() {
  const { data } = await apiClient.get<unknown>('/hideout/progress');
  return extractProgressPayload(data);
}

export async function syncHideoutProgress(payload: SyncModuleProgressDto[]) {
  await apiClient.post('/hideout/sync', payload);
}
