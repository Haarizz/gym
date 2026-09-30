import { isAxiosError } from 'axios';

export type SettlementErrorKind =
  /** No response — the payment may or may not have been recorded. Retry with the same key. */
  | 'network'
  /** 409 — balance changed, already paid, or the same payment is still being processed. */
  | 'conflict'
  /** 400/404 — the request itself was refused. */
  | 'rejected';

export interface SettlementError {
  kind: SettlementErrorKind;
  message: string;
}

export function toSettlementError(error: unknown): SettlementError {
  if (isAxiosError(error) && error.response) {
    const message: string | undefined = error.response.data?.message;
    if (error.response.status === 409) {
      return { kind: 'conflict', message: message || 'Your balance has changed. Please review and try again.' };
    }
    return { kind: 'rejected', message: message || 'Payment could not be completed.' };
  }
  return {
    kind: 'network',
    message: 'We couldn’t confirm your payment because the connection was lost. Retrying is safe — you won’t be charged twice.',
  };
}

export function isNotFoundError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 404;
}
