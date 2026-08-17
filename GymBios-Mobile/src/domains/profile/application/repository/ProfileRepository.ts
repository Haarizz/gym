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

export interface ProfileRepository {
  getProfile(): Promise<Profile>;
  getSummary(): Promise<ProfileSummary>;
  getTargets(): Promise<UserTarget[]>;
  getPerformance(): Promise<UserPerformance>;
  getTransactions(): Promise<{
    transactions: UserTransaction[];
    summary: UserTransactionSummary;
  }>;
  getSettings(): Promise<UserSettings>;
  updateProfile(data: UpdateProfileDto): Promise<Profile>;
  updateProfilePhoto(photoUriOrDataUrl: string): Promise<string>;
  changePassword(data: ChangePasswordDto): Promise<void>;
  updateSettings(data: UpdateSettingsDto): Promise<UserSettings>;
}
