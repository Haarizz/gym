import type { Result } from '@/core/types';

export class Username {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(raw: string): Result<Username, string> {
    const normalized = raw.trim();

    if (!normalized) {
      return { success: false, error: 'Username is required' };
    }

    if (normalized.length < 3) {
      return { success: false, error: 'Username must be at least 3 characters' };
    }

    return { success: true, value: new Username(normalized) };
  }
}
