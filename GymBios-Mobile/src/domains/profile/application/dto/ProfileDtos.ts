import type { NotificationSettings, PrivacySettings } from '../../domain';

export interface UpdateProfileDto {
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateSettingsDto {
  notifications?: Partial<NotificationSettings>;
  privacy?: Partial<PrivacySettings>;
}
