import { i18n } from '@/core/i18n';
import type { Result } from '@/core/types';
import type { Session } from '../../domain/entities/Session';
import type { AuthRepository } from '../../domain/repositories/AuthRepository';

export interface VerifyOtpDto {
  registrationToken: string;
  otp: string;
}

export class VerifyOtp {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(input: VerifyOtpDto): Promise<Result<Session, string>> {
    if (!input.registrationToken) {
      return { success: false, error: i18n.t('auth.errors.registrationNotFound') };
    }
    if (!input.otp || input.otp.trim().length !== 6) {
      return { success: false, error: i18n.t('auth.errors.enterCode') };
    }
    return this.authRepository.verifyOtp(input.registrationToken, input.otp.trim());
  }
}
