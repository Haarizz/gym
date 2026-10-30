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
    // Lets the backend see which app builds still call deprecated APIs (e.g. the
    // legacy /community endpoints) before retiring them behind a minimum version.
    'X-App-Version': env.appVersion,
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

// Set by AuthBootstrap: what to do when the backend rejects this sign-in (401) — the
// token expired, or the login behind it was disabled (e.g. an old gym-only login moved
// to a GymBios account). Kept here as a callback so the network layer doesn't depend on
// the auth domain.
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

/** The gym the app is currently working in (X-Tenant-ID), if any. */
export function getApiClientTenant(): string | null {
  const tenant = apiClient.defaults.headers.common['X-Tenant-ID'];
  return typeof tenant === 'string' && tenant ? tenant : null;
}

export function setApiClientTenant(tenant: string | null) {
  if (tenant) {
    apiClient.defaults.headers.common['X-Tenant-ID'] = tenant;
  } else {
    delete apiClient.defaults.headers.common['X-Tenant-ID'];
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status ?? 0;
    const body = error.response?.data;
    // Only a signed-in request's 401 means the session is gone (login itself answers
    // 401 for a wrong password with no token attached).
    const sentToken = !!error.config?.headers?.Authorization;
    if (status === 401 && sentToken && unauthorizedHandler) {
      unauthorizedHandler();
      return Promise.reject(new ApiError('Session expired', status, body));
    }
    // Some controllers (e.g. member access) return the reason as a plain-text body.
    const rawBody: unknown = body;
    const textBody = typeof rawBody === 'string' && rawBody.trim() ? rawBody : undefined;
    const message =
      textBody ?? body?.message ?? body?.error ?? error.message ?? 'An unexpected error occurred';

    // Suppress toasts for pure network failures (no response received — device
    // is offline, timed out, or the server is unreachable). The NetworkGuard
    // already shows a full-screen offline wall in that case.
    const isNetworkError = !error.response;

    if (!isNetworkError && !error.config?.skipGlobalErrorToast) {
      toast.error(message);
    }

    return Promise.reject(new ApiError(message, status, body));
  },
);

