import { i18n } from '@/core/i18n';
import type { Result } from '@/core/types';

export class Password {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(raw: string): Result<Password, string> {
    if (!raw.trim()) {
      return { success: false, error: i18n.t('auth.errors.passwordRequired') };
    }

    if (raw.length < 6) {
      return { success: false, error: i18n.t('auth.errors.passwordMin') };
    }

    return { success: true, value: new Password(raw) };
  }
}
