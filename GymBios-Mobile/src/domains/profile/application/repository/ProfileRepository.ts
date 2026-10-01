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

export interface ProfileRepository {
  getProfile(): Promise<Profile>;
  getSummary(role: SummaryRole): Promise<ProfileSummary>;
  getTargets(): Promise<UserTarget[]>;
  getPerformance(role: PerformanceRole): Promise<UserPerformance>;
  getTransactions(): Promise<{
    transactions: UserTransaction[];
    summary: UserTransactionSummary;
  }>;
  getSettings(): Promise<UserSettings>;
  updateProfile(data: UpdateProfileDto): Promise<Profile>;
  /** The caller's employee record, or null when the account isn't linked to one. */
  getStaffProfile(): Promise<StaffProfile | null>;
  updateStaffContact(data: UpdateStaffContactDto): Promise<StaffProfile>;
  updateProfilePhoto(photoUriOrDataUrl: string): Promise<string>;
  changePassword(data: ChangePasswordDto): Promise<void>;
  updateSettings(data: UpdateSettingsDto): Promise<UserSettings>;
}
