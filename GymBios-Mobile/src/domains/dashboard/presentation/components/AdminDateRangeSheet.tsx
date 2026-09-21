import { Pressable, StyleSheet, Text, View } from 'react-native';
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

function buildPresets(): Array<{ label: string; range: AdminDashboardDateRange }> {
  const today = new Date();
  return [
    { label: 'Today', range: { from: iso(today), to: iso(today) } },
    { label: 'Yesterday', range: { from: iso(subDays(today, 1)), to: iso(subDays(today, 1)) } },
    { label: 'Last 7 Days', range: { from: iso(subDays(today, 6)), to: iso(today) } },
    { label: 'Last 30 Days', range: { from: iso(subDays(today, 29)), to: iso(today) } },
    { label: 'This Month', range: { from: iso(startOfMonth(today)), to: iso(today) } },
  ];
}

export function AdminDateRangeSheet({ visible, range, onSelect, onClose }: AdminDateRangeSheetProps) {
  const presets = buildPresets();

  return (
    <AppBottomSheet visible={visible} title="Select Period" subtitle="Choose the dashboard's date range" onClose={onClose}>
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
