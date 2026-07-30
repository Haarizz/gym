import type { Result } from '@/core/types';

export class Password {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(raw: string): Result<Password, string> {
    if (!raw.trim()) {
      return { success: false, error: 'Password is required' };
    }

    if (raw.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    return { success: true, value: new Password(raw) };
  }
}
