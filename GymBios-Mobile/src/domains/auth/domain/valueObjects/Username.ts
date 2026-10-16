import { i18n } from '@/core/i18n';
import type { Result } from '@/core/types';

export class Username {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(raw: string): Result<Username, string> {
    const normalized = raw.trim();

    if (!normalized) {
      return { success: false, error: i18n.t('auth.errors.usernameRequired') };
    }

    if (normalized.length < 3) {
      return { success: false, error: i18n.t('auth.errors.usernameMin') };
    }

    return { success: true, value: new Username(normalized) };
  }
}
