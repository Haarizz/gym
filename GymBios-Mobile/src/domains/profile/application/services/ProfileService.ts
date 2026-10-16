import type { ProfileRepository } from '../repository/ProfileRepository';
import type {
  Profile,
  ProfileSummary,
  PerformanceRole,
  StaffProfile,
  SummaryRole,
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
  UpdateStaffContactDto,
} from '../dto/ProfileDtos';
import { i18n } from '@/core/i18n';

export class ProfileService {
  constructor(private readonly repository: ProfileRepository) {}

  async getProfile(): Promise<Profile> {
    return this.repository.getProfile();
  }

  async getSummary(role: SummaryRole): Promise<ProfileSummary> {
    return this.repository.getSummary(role);
  }

  async getTargets(): Promise<UserTarget[]> {
    return this.repository.getTargets();
  }

  async getPerformance(role: PerformanceRole): Promise<UserPerformance> {
    return this.repository.getPerformance(role);
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
      throw new Error(i18n.t('myProfile.nameRequired'));
    }
    if (!data.email.trim()) {
      throw new Error(i18n.t('myProfile.emailRequired'));
    }
    return this.repository.updateProfile(data);
  }

  async getStaffProfile(): Promise<StaffProfile | null> {
    return this.repository.getStaffProfile();
  }

  async updateStaffContact(data: UpdateStaffContactDto): Promise<StaffProfile> {
    return this.repository.updateStaffContact(data);
  }

  async updateProfilePhoto(photoUriOrDataUrl: string): Promise<string> {
    if (!photoUriOrDataUrl) {
      throw new Error(i18n.t('myProfile.photoRequired'));
    }
    return this.repository.updateProfilePhoto(photoUriOrDataUrl);
  }

  async changePassword(data: ChangePasswordDto): Promise<void> {
    if (!data.currentPassword) {
      throw new Error(i18n.t('myProfile.currentPasswordRequired'));
    }
    if (!data.newPassword || data.newPassword.length < 8) {
      throw new Error(i18n.t('myProfile.passwordTooShort'));
    }
    return this.repository.changePassword(data);
  }

  async updateSettings(data: UpdateSettingsDto): Promise<UserSettings> {
    return this.repository.updateSettings(data);
  }
}
