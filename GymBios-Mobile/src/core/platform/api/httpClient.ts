import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { env } from '@/core/platform/config';
import { secureStorage } from '@/core/platform/storage';
import { StorageKeys } from '@/core/platform/storage/storageKeys';

import { ApiError, type ApiErrorBody } from './types';

export const httpClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 30_000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

httpClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await secureStorage.getItem(StorageKeys.accessToken);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status ?? 0;
    const body = error.response?.data;
    const message = body?.message ?? error.message ?? 'An unexpected error occurred';

    return Promise.reject(new ApiError(message, status, body));
  },
);
