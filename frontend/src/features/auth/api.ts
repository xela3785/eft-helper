import { apiClient } from '../../shared/api/client';

export interface AuthPayload {
  username: string;
  password: string;
}

export async function registerUser(payload: AuthPayload) {
  const { data } = await apiClient.post('/auth/register', payload);
  return data;
}

export async function loginUser(payload: AuthPayload) {
  const { data } = await apiClient.post('/auth/login', payload);
  return data;
}
