import type { NotificationSettings, PrivacySettings } from '../../domain';

export interface UpdateProfileDto {
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

/** Staff can only edit their own contact details; the rest of the employee record is admin-managed. */
export interface UpdateStaffContactDto {
  phone: string;
  address: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateSettingsDto {
  notifications?: Partial<NotificationSettings>;
  privacy?: Partial<PrivacySettings>;
}
