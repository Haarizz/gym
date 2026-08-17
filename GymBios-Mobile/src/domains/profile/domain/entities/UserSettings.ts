export interface NotificationSettings {
  email: boolean;
  push: boolean;
  sms: boolean;
  performance: boolean;
  targets: boolean;
  payroll: boolean;
}

export interface LinkedAccount {
  id: string;
  name: string;
  detail: string;
  type: 'email' | 'device' | 'bank';
  status: 'connected' | 'not_connected';
}

export interface PrivacySettings {
  profileVisibility: boolean;
  performanceVisibility: boolean;
  activityStatus: boolean;
}

export interface UserSettings {
  notifications: NotificationSettings;
  linkedAccounts: LinkedAccount[];
  privacy: PrivacySettings;
}
