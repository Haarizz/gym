import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { env } from '@/core/platform/config';
import { secureStorage } from '@/core/platform/storage';
import { StorageKeys } from '@/core/platform/storage/storageKeys';

import { ApiError, type ApiErrorBody } from '@/core/platform/api/types';
import { toast } from '@/shared/components/Toasts/toastStore';

/**
 * Shared API client for the mobile app.
 *
 * Includes JWT auth token injection (via secure storage) and response
 * error normalisation, mirroring the behaviour of `httpClient` in
 * `core/platform/api`.  This ensures that every domain's infrastructure
 * layer — including the attendance module — sends authenticated requests.
 */
export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 10_000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

export function setApiClientToken(token: string | null) {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common.Authorization;
  }
}

export function setApiClientBranch(branchId: number | 'ALL') {
  if (branchId === 'ALL') {
    delete apiClient.defaults.headers.common['X-Active-Branch-Id'];
  } else {
    apiClient.defaults.headers.common['X-Active-Branch-Id'] = String(branchId);
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status ?? 0;
    const body = error.response?.data;
    const message =
      body?.message ?? error.message ?? 'An unexpected error occurred';

    if (!error.config?.skipGlobalErrorToast) {
      toast.error(message);
    }

    return Promise.reject(new ApiError(message, status, body));
  },
);
