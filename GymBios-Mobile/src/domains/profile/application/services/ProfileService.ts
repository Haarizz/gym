import type { ProfileRepository } from '../repository/ProfileRepository';
import type {
  Profile,
  ProfileSummary,
  UserPerformance,
  UserSettings,
  UserTarget,
  UserTransaction,
  UserTransactionSummary,
} from '../../domain';
import type {
  ChangePasswordDto,
  UpdateProfileDto,
  UpdateSettingsDto,
} from '../dto/ProfileDtos';

export class ProfileService {
  constructor(private readonly repository: ProfileRepository) {}

  async getProfile(): Promise<Profile> {
    return this.repository.getProfile();
  }

  async getSummary(): Promise<ProfileSummary> {
    return this.repository.getSummary();
  }

  async getTargets(): Promise<UserTarget[]> {
    return this.repository.getTargets();
  }

  async getPerformance(): Promise<UserPerformance> {
    return this.repository.getPerformance();
  }

  async getTransactions(): Promise<{
    transactions: UserTransaction[];
    summary: UserTransactionSummary;
  }> {
    return this.repository.getTransactions();
  }

  async getSettings(): Promise<UserSettings> {
    return this.repository.getSettings();
  }

  async updateProfile(data: UpdateProfileDto): Promise<Profile> {
    if (!data.name.trim()) {
      throw new Error('Name is required');
    }
    if (!data.email.trim()) {
      throw new Error('Email is required');
    }
    return this.repository.updateProfile(data);
  }

  async updateProfilePhoto(photoUriOrDataUrl: string): Promise<string> {
    if (!photoUriOrDataUrl) {
      throw new Error('Photo is required');
    }
    return this.repository.updateProfilePhoto(photoUriOrDataUrl);
  }

  async changePassword(data: ChangePasswordDto): Promise<void> {
    if (!data.currentPassword) {
      throw new Error('Current password is required');
    }
    if (!data.newPassword || data.newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters');
    }
    return this.repository.changePassword(data);
  }

  async updateSettings(data: UpdateSettingsDto): Promise<UserSettings> {
    return this.repository.updateSettings(data);
  }
}
