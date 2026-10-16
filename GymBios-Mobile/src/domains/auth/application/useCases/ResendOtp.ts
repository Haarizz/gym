import { i18n } from '@/core/i18n';
import type { Result } from '@/core/types';
import type { PendingRegistration } from '../../domain/entities/PendingRegistration';
import type { AuthRepository } from '../../domain/repositories/AuthRepository';

export class ResendOtp {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(
    registrationToken: string,
  ): Promise<Result<Pick<PendingRegistration, 'otpExpiresAt' | 'resendAvailableAt' | 'devOtp'>, string>> {
    if (!registrationToken) {
      return { success: false, error: i18n.t('auth.errors.registrationNotFound') };
    }
    return this.authRepository.resendOtp(registrationToken);
  }
}
