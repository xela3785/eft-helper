import { apiClient } from '../../shared/api/client';
import type { HideoutModule } from './types';

export async function getHideoutModules() {
  const { data } = await apiClient.get<HideoutModule[]>('/hideout/module/list');
  return data;
}

export async function getHideoutModule(moduleId: string) {
  const { data } = await apiClient.get<HideoutModule>(`/hideout/module/${moduleId}`);
  return data;
}
