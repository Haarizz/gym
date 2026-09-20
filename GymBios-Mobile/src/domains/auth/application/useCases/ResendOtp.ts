import type { Result } from '@/core/types';
import type { PendingRegistration } from '../../domain/entities/PendingRegistration';
import type { AuthRepository } from '../../domain/repositories/AuthRepository';

export class ResendOtp {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(
    registrationToken: string,
  ): Promise<Result<Pick<PendingRegistration, 'otpExpiresAt' | 'resendAvailableAt' | 'devOtp'>, string>> {
    if (!registrationToken) {
      return { success: false, error: 'Registration session not found. Please register again.' };
    }
    return this.authRepository.resendOtp(registrationToken);
  }
}
