import { AxiosError } from 'axios';

export function getErrorStatus(error: unknown) {
  if (error instanceof AxiosError) {
    return error.response?.status;
  }

  return undefined;
}

export function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail;

    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }

    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}
