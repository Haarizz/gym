import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { env } from '@/core/platform/config';
import { secureStorage } from '@/core/platform/storage';
import { StorageKeys } from '@/core/platform/storage/storageKeys';

import { ApiError, type ApiErrorBody } from './types';
import { toast } from '@/shared/components/Toasts/toastStore';

export const httpClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 30_000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

export function setHttpClientToken(token: string | null) {
  if (token) {
    httpClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete httpClient.defaults.headers.common.Authorization;
  }
}

httpClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status ?? 0;
    const body = error.response?.data;
    const message = body?.message ?? error.message ?? 'An unexpected error occurred';

    if (!error.config?.skipGlobalErrorToast) {
      toast.error(message);
    }

    return Promise.reject(new ApiError(message, status, body));
  },
);
