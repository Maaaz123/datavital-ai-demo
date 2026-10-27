import type { AxiosError } from 'axios';

/** Operator-facing console log for API failures; never includes tokens or bodies with secrets. */
export function logApiFailure(error: AxiosError): void {
  const status = error.response?.status;
  const method = (error.config?.method || 'get').toUpperCase();
  const url = error.config?.url || 'unknown';
  console.warn(`[api] ${method} ${url} failed`, status ?? error.code ?? error.message);
}
