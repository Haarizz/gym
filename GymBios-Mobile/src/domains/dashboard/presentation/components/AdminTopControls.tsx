import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/components/AppText';
import Feather from '@expo/vector-icons/Feather';
import { Radius, Spacing } from '@/core/theme';
import { GlassSurface } from '@/shared/components';

interface AdminTopControlsProps {
  branch?: string;
  dateText?: string;
  hasAlerts?: boolean;
  onSelectBranch?: () => void;
  onCalendarPress?: () => void;
  onRefreshPress?: () => void;
  onBellPress?: () => void;
}

export function AdminTopControls({
  branch,
  dateText = '',
  hasAlerts = true,
  onSelectBranch,
  onCalendarPress,
  onRefreshPress,
  onBellPress,
}: AdminTopControlsProps) {
  const { t } = useTranslation();
  const displayBranch = branch || t('dashboard.admin.allBranches');

  return (
    <GlassSurface radius={16} style={styles.container}>
      {/* Top Filter Row */}
      <View style={styles.filterRow}>
        <Pressable
          style={styles.dropdown}
          onPress={onSelectBranch}
          accessibilityRole="button"
          accessibilityLabel={t('dashboard.admin.selectBranchA11y', { branch: displayBranch })}
        >
          <Text style={styles.dropdownText}>{displayBranch}</Text>
          <Feather name="chevron-down" size={16} color="#6B7280" />
        </Pressable>

        <Pressable
          style={styles.iconButton}
          onPress={onCalendarPress}
          accessibilityRole="button"
          accessibilityLabel={t('dashboard.admin.openCalendarA11y')}
        >
          <Feather name="calendar" size={18} color="#4B5563" />
        </Pressable>

        <Pressable
          style={styles.iconButton}
          onPress={onRefreshPress}
          accessibilityRole="button"
          accessibilityLabel={t('dashboard.admin.refreshDashboardA11y')}
        >
          <Feather name="refresh-cw" size={18} color="#4B5563" />
        </Pressable>
      </View>

      {/* Date & Alerts Header */}
      <View style={styles.dateHeader}>
        <Text style={styles.dateText}>{dateText}</Text>
        <Pressable
          style={styles.bellButton}
          onPress={onBellPress}
          accessibilityRole="button"
          accessibilityLabel={t('dashboard.admin.viewAlertsA11y')}
        >
          <Feather name="bell" size={18} color="#4B5563" />
          {hasAlerts && <View style={styles.alertDot} />}
        </Pressable>
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.four,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.three,
  },
  dropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  iconButton: {
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  dateText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  bellButton: {
    padding: 4,
    position: 'relative',
  },
  alertDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
});
