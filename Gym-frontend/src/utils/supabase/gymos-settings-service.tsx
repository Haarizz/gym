import api from '../../api/axiosConfig';

// GymOS's Transfer Policy, Member Deactivation Policy, and System
// Configuration widget: real key/value settings, grouped by category.

export type GymOsSettingCategory = 'TRANSFER_POLICY' | 'DEACTIVATION_POLICY' | 'SYSTEM_CONFIG';

interface GymOsSettingWire {
  id: number;
  category: string;
  setting_key: string;
  setting_value: string | null;
}

export interface GymOsSetting {
  id: number;
  category: string;
  settingKey: string;
  settingValue: string | null;
}

function mapSetting(w: GymOsSettingWire): GymOsSetting {
  return { id: w.id, category: w.category, settingKey: w.setting_key, settingValue: w.setting_value };
}

/** Converts a flat settings list into a { key: value } map for easy reading in components. */
export function settingsToMap(settings: GymOsSetting[]): Record<string, string> {
  const map: Record<string, string> = {};
  settings.forEach(s => { if (s.settingValue != null) map[s.settingKey] = s.settingValue; });
  return map;
}

export const gymOsSettingsService = {
  getByCategory: async (category: GymOsSettingCategory): Promise<GymOsSetting[]> => {
    const res = await api.get<GymOsSettingWire[]>(`/gymos/settings/${category}`);
    return res.data.map(mapSetting);
  },

  bulkUpsert: async (category: GymOsSettingCategory, settings: Record<string, string>): Promise<GymOsSetting[]> => {
    const res = await api.put<GymOsSettingWire[]>(`/gymos/settings/${category}`, { settings });
    return res.data.map(mapSetting);
  },
};
