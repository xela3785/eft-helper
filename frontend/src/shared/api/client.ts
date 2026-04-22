import axios from 'axios';

const defaultApiBaseUrl = 'http://127.0.0.1:8000/api/v1';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? defaultApiBaseUrl,
  timeout: 10_000,
  withCredentials: true,
});
