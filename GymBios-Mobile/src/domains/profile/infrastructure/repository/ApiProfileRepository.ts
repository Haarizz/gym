import type { ProfileRepository } from '../../application/repository/ProfileRepository';
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
} from '../../application/dto/ProfileDtos';
import { ProfileApi, type ApiAuthMeResponse } from '../api/ProfileApi';
import { useAuthStore } from '@/domains/auth/store';
import { secureStorage } from '@/core/platform/storage';

const SETTINGS_STORAGE_KEY = 'gymbios.user_settings';
const PHOTO_STORAGE_PREFIX = 'gymbios.user_photo_';
const PROFILE_DATA_PREFIX = 'gymbios.user_profile_data_';

export class ApiProfileRepository implements ProfileRepository {
  constructor(private readonly api: ProfileApi) {}

  async getProfile(): Promise<Profile> {
    const authState = useAuthStore.getState();
    const currentUser = authState.user;

    // 1. Primary endpoint: GET /api/auth/me from AuthController
    let authMe: ApiAuthMeResponse | null = null;
    try {
      authMe = await this.api.getAuthMe();
    } catch {
      // If offline or network issue, fallback to auth store
    }

    const userId = String(authMe?.user_id ?? authMe?.userId ?? currentUser?.id ?? '1');
    const username = authMe?.username ?? currentUser?.username ?? 'admin';
    const primaryRole = authMe?.role_name ?? authMe?.roleName ?? (authMe?.roles && authMe.roles[0]) ?? currentUser?.appRole ?? 'ADMIN';

    // Capitalize username when staff_name is null/empty
    const formattedUsername = username ? username.charAt(0).toUpperCase() + username.slice(1) : 'Admin';
    const primaryName = authMe?.staff_name || authMe?.staffName || formattedUsername;

    // 2. Check local saved profile details (if user edited name/phone/address)
    const localProfileRaw = await secureStorage.getItem(`${PROFILE_DATA_PREFIX}${userId}`);
    let localProfile: Partial<Profile> = {};
    if (localProfileRaw) {
      try {
        localProfile = JSON.parse(localProfileRaw);
      } catch {
        // ignore
      }
    }

    // 3. Local persistent photo override if stored
    const localPhoto = await secureStorage.getItem(`${PHOTO_STORAGE_PREFIX}${userId}`);

    const name = localProfile.name || primaryName;
    const email = localProfile.email || currentUser?.email || `${username}@gymbios.local`;
    const phone = localProfile.phone || '';
    const address = localProfile.address || '';
    const photoUrl = localPhoto || undefined;
    const roleDisplay = primaryRole.toUpperCase();

    return {
      id: userId,
      userId,
      name,
      email,
      phone,
      address,
      role: roleDisplay,
      department: 'Management',
      branch: 'All branches',
      staffId: `EMP-${userId.padStart(4, '0')}`,
      joinDate: '2024-01-15',
      photoUrl,
      status: authMe?.enabled !== false ? 'Active' : 'Inactive',
    };
  }

  async getSummary(): Promise<ProfileSummary> {
    return {
      performanceScore: 94,
      completedTargets: 24,
      totalTargets: 32,
      attendanceRate: 98,
    };
  }

  async getTargets(): Promise<UserTarget[]> {
    return [
      {
        id: 'TG001',
        title: 'Monthly Client Sessions',
        description: 'Complete 80 personal training sessions',
        progress: 72,
        target: 80,
        unit: 'sessions',
        deadline: '2024-11-30',
        status: 'active',
        category: 'Performance',
      },
      {
        id: 'TG002',
        title: 'Client Satisfaction',
        description: 'Maintain 95%+ satisfaction rating across member reviews',
        progress: 96,
        target: 95,
        unit: '%',
        deadline: '2024-11-30',
        status: 'completed',
        category: 'Quality',
      },
      {
        id: 'TG003',
        title: 'New Client Acquisition',
        description: 'Onboard 5 new premium membership clients',
        progress: 3,
        target: 5,
        unit: 'clients',
        deadline: '2024-11-30',
        status: 'active',
        category: 'Growth',
      },
      {
        id: 'TG004',
        title: 'Facility Safety Audit',
        description: 'Perform all quarterly safety equipment inspections',
        progress: 10,
        target: 10,
        unit: 'audits',
        deadline: '2024-10-31',
        status: 'completed',
        category: 'Operations',
      },
    ];
  }

  async getPerformance(): Promise<UserPerformance> {
    return {
      performanceScore: 94,
      classesCompleted: 156,
      hoursWorked: 340,
      clientSatisfaction: 96,
      kpis: [
        {
          label: 'Performance Growth',
          value: '+12%',
          growth: '+12%',
          isPositive: true,
          subtitle: 'vs last month',
        },
        {
          label: 'Client Retention',
          value: '+8%',
          growth: '+8%',
          isPositive: true,
          subtitle: 'vs last quarter',
        },
        {
          label: 'Session Quality',
          value: '+15%',
          growth: '+15%',
          isPositive: true,
          subtitle: 'avg rating improvement',
        },
      ],
    };
  }

  async getTransactions(): Promise<{
    transactions: UserTransaction[];
    summary: UserTransactionSummary;
  }> {
    return {
      transactions: [
        {
          id: 'T001',
          type: 'salary',
          description: 'Monthly Salary Credit',
          amount: 4285,
          date: '2024-10-30T10:00:00Z',
          status: 'completed',
        },
        {
          id: 'T002',
          type: 'bonus',
          description: 'Quarterly Performance Bonus',
          amount: 500,
          date: '2024-10-15T14:30:00Z',
          status: 'completed',
        },
        {
          id: 'T003',
          type: 'attendance',
          description: 'Morning Shift Check-in Verified',
          date: '2024-10-30T07:00:00Z',
          status: 'completed',
        },
        {
          id: 'T004',
          type: 'purchase',
          description: 'Cafeteria & Pro-Shop Purchase',
          amount: 25,
          date: '2024-10-29T13:15:00Z',
          status: 'completed',
        },
        {
          id: 'T005',
          type: 'membership',
          description: 'Annual Membership Plan Renewal',
          amount: 1200,
          date: '2024-10-01T09:00:00Z',
          status: 'completed',
        },
      ],
      summary: {
        totalEarnings: 4785,
        totalTransactions: 156,
        totalPurchases: 89,
        totalBonuses: 2,
      },
    };
  }

  async getSettings(): Promise<UserSettings> {
    const raw = await secureStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as UserSettings;
      } catch {
        // fallback
      }
    }

    const defaultSettings: UserSettings = {
      notifications: {
        email: true,
        push: true,
        sms: false,
        performance: true,
        targets: true,
        payroll: true,
      },
      linkedAccounts: [
        {
          id: 'acc-email',
          name: 'Email Account',
          detail: 'Verified for 2FA & alerts',
          type: 'email',
          status: 'connected',
        },
        {
          id: 'acc-device',
          name: 'Mobile Device',
          detail: 'Primary trusted device',
          type: 'device',
          status: 'connected',
        },
        {
          id: 'acc-bank',
          name: 'Bank Account',
          detail: 'ADCB ****1234 (Payroll)',
          type: 'bank',
          status: 'connected',
        },
      ],
      privacy: {
        profileVisibility: true,
        performanceVisibility: true,
        activityStatus: true,
      },
    };

    return defaultSettings;
  }

  async updateProfile(data: UpdateProfileDto): Promise<Profile> {
    const current = await this.getProfile();
    const updated: Profile = {
      ...current,
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
    };

    const userId = current.userId || 'default';
    await secureStorage.setItem(
      `${PROFILE_DATA_PREFIX}${userId}`,
      JSON.stringify({
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
      }),
    );

    return updated;
  }

  async updateProfilePhoto(photoUriOrDataUrl: string): Promise<string> {
    const authState = useAuthStore.getState();
    const userId = authState.user?.id || 'default';

    await secureStorage.setItem(`${PHOTO_STORAGE_PREFIX}${userId}`, photoUriOrDataUrl);
    return photoUriOrDataUrl;
  }

  async changePassword(data: ChangePasswordDto): Promise<void> {
    await this.api.changePassword(data.currentPassword, data.newPassword);
  }

  async updateSettings(data: UpdateSettingsDto): Promise<UserSettings> {
    const current = await this.getSettings();
    const updated: UserSettings = {
      ...current,
      notifications: {
        ...current.notifications,
        ...(data.notifications || {}),
      },
      privacy: {
        ...current.privacy,
        ...(data.privacy || {}),
      },
    };

    await secureStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  }
}
