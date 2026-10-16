import { i18n } from '@/core/i18n';
import type { Result } from '@/core/types';
import type { PendingRegistration } from '../../domain/entities/PendingRegistration';
import type { AuthRepository } from '../../domain/repositories/AuthRepository';

export interface RegisterUserDto {
  fullName: string;
  username: string;
  email: string;
  password: string;
}

export class RegisterUser {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(input: RegisterUserDto): Promise<Result<PendingRegistration, string>> {
    try {
      if (!input.fullName || !input.username || !input.email || !input.password) {
        return { success: false, error: i18n.t('auth.errors.allFieldsRequired') };
      }
      // Assuming authRepository has registerMobileUser method
      return await this.authRepository.registerMobileUser(input);
    } catch (e) {
      return { success: false, error: i18n.t('auth.errors.registrationFailed') };
    }
  }
}
