import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Text } from '@/shared/components/AppText';
import Feather from '@expo/vector-icons/Feather';
import { format, subDays, startOfMonth } from 'date-fns';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet/AppBottomSheet';
import type { AdminDashboardDateRange } from '../../hooks/useAdminDashboard';

interface AdminDateRangeSheetProps {
  visible: boolean;
  range: AdminDashboardDateRange;
  onSelect: (range: AdminDashboardDateRange) => void;
  onClose: () => void;
}

function iso(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function buildPresets(t: TFunction): Array<{ label: string; range: AdminDashboardDateRange }> {
  const today = new Date();
  return [
    { label: t('dashboard.admin.dateRangeSheet.presets.today'), range: { from: iso(today), to: iso(today) } },
    { label: t('dashboard.admin.dateRangeSheet.presets.yesterday'), range: { from: iso(subDays(today, 1)), to: iso(subDays(today, 1)) } },
    { label: t('dashboard.admin.dateRangeSheet.presets.last7Days'), range: { from: iso(subDays(today, 6)), to: iso(today) } },
    { label: t('dashboard.admin.dateRangeSheet.presets.last30Days'), range: { from: iso(subDays(today, 29)), to: iso(today) } },
    { label: t('dashboard.admin.dateRangeSheet.presets.thisMonth'), range: { from: iso(startOfMonth(today)), to: iso(today) } },
  ];
}

export function AdminDateRangeSheet({ visible, range, onSelect, onClose }: AdminDateRangeSheetProps) {
  const { t } = useTranslation();
  const presets = buildPresets(t);

  return (
    <AppBottomSheet
      visible={visible}
      title={t('dashboard.admin.dateRangeSheet.title')}
      subtitle={t('dashboard.admin.dateRangeSheet.subtitle')}
      onClose={onClose}
    >
      <View style={styles.list}>
        {presets.map((preset) => {
          const isSelected = preset.range.from === range.from && preset.range.to === range.to;
          return (
            <Pressable
              key={preset.label}
              style={styles.row}
              onPress={() => {
                onSelect(preset.range);
                onClose();
              }}
              accessibilityRole="button"
            >
              <Text style={styles.rowText}>{preset.label}</Text>
              {isSelected && <Feather name="check" size={18} color={BrandColors.teal} />}
            </Pressable>
          );
        })}
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: Spacing.four,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    borderRadius: Radius.sm,
  },
  rowText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1E293B',
  },
});
