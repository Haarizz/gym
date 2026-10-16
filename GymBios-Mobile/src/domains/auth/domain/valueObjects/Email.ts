import { i18n } from '@/core/i18n';
import type { Result } from '@/core/types';

export class Email {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(raw: string): Result<Email, string> {
    const normalized = raw.trim().toLowerCase();

    if (!normalized) {
      return { success: false, error: i18n.t('auth.errors.emailRequired') };
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalized)) {
      return { success: false, error: i18n.t('auth.errors.emailInvalid') };
    }

    return { success: true, value: new Email(normalized) };
  }
}
