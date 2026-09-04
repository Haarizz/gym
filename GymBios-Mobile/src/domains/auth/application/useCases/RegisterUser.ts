import type { Result } from '@/core/types';
import type { Session } from '../../domain/entities/Session';
import type { AuthRepository } from '../../domain/repositories/AuthRepository';

export interface RegisterUserDto {
  fullName: string;
  username: string;
  email: string;
  password: string;
}

export class RegisterUser {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(input: RegisterUserDto): Promise<Result<Session, string>> {
    try {
      if (!input.fullName || !input.username || !input.email || !input.password) {
        return { success: false, error: 'All fields are required.' };
      }
      // Assuming authRepository has registerMobileUser method
      return await this.authRepository.registerMobileUser(input);
    } catch (e) {
      return { success: false, error: 'An error occurred during registration.' };
    }
  }
}
