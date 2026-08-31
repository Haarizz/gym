import 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipGlobalErrorToast?: boolean;
  }
}

export interface ApiErrorBody {
  message?: string;
  code?: string;
  errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly body?: ApiErrorBody;

  constructor(message: string, status: number, body?: ApiErrorBody) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}
