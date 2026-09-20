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
      return { success: false, error: 'Registration session not found. Please register again.' };
    }
    if (!input.otp || input.otp.trim().length !== 6) {
      return { success: false, error: 'Enter the 6-digit code.' };
    }
    return this.authRepository.verifyOtp(input.registrationToken, input.otp.trim());
  }
}
