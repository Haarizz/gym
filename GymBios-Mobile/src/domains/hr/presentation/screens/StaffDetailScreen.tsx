import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';

import { useTheme } from '@/core/hooks';
import { CurrencyValue } from '@/core/providers';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet';
import { Avatar } from '@/shared/components/Avatar';
import { AppHeader } from '@/shared/components/AppHeader';
import { ConfirmationModal } from '@/shared/components/ConfirmationModal';
import { Typography } from '@/shared/components/Typography';
import { ScreenLayout, useTabBarBottomInset } from '@/shared/layouts/ScreenLayout';
import { useStaff } from '../hooks/useStaff';

import { toast } from '@/shared/components/Toasts/toastStore';

// Same values the web admin's "Change status" dialog writes.
const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', icon: 'check-circle', color: BrandColors.teal },
  { value: 'inactive', label: 'Inactive', icon: 'user-x', color: BrandColors.danger },
  { value: 'on_leave', label: 'On Leave', icon: 'clock', color: BrandColors.trainerAmber },
] as const;

const WEEKDAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// Schedule keys come back in insertion order; show them Monday → Sunday.
function weekdayRank(day: string) {
  const i = WEEKDAY_ORDER.indexOf(day.toLowerCase());
  return i === -1 ? WEEKDAY_ORDER.length : i;
}

interface StaffDetailScreenProps {
  staffId: string;
  onBack: () => void;
  onDeleted: () => void;
  onUpdated: () => void;
}

export function StaffDetailScreen({
  staffId,
  onBack,
  onDeleted,
  onUpdated,
}: StaffDetailScreenProps) {
  const theme = useTheme();
  const router = useRouter();
  const { selectedStaff, loadStaff, deleteStaff, updateStaffStatus, submitting } = useStaff();
  const [statusSheetVisible, setStatusSheetVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  useEffect(() => {
    loadStaff(staffId);
  }, [staffId, loadStaff]);

  // ConfirmationModal rather than Alert.alert: react-native-web's Alert is a no-op,
  // so the confirm (and the delete call) never happened in the browser.
  const handleDelete = useCallback(async () => {
    try {
      await deleteStaff(staffId);
      setDeleteConfirmVisible(false);
      onDeleted();
    } catch {
      setDeleteConfirmVisible(false);
      toast.error('Failed to delete staff member.', {
        title: 'Error'
      });
    }
  }, [staffId, deleteStaff, onDeleted]);

  const handleChangeStatus = useCallback(
    async (status: string) => {
      setStatusSheetVisible(false);
      if (selectedStaff?.status?.toLowerCase() === status) return;
      try {
        await updateStaffStatus(staffId, status);
        toast.success('Staff status updated.');
        onUpdated();
      } catch {
        toast.error('Failed to update staff status.', { title: 'Error' });
      }
    },
    [selectedStaff?.status, staffId, updateStaffStatus, onUpdated],
  );

  const handleSetTarget = useCallback(() => {
    toast.info('Setting targets from the app is coming in an upcoming update.', {
      title: 'Coming soon',
    });
  }, []);

  const handleEdit = useCallback(() => {
    router.push(`/(admin)/staff/edit/${staffId}` as any);
  }, [router, staffId]);

  const tabBarInset = useTabBarBottomInset();

  if (!selectedStaff) {
    return (
      <ScreenLayout edges={TAB_SCREEN_EDGES}>
        <AppHeader
          title="Staff Details"
          colors={[theme.primary, theme.primary]}
          onBack={onBack}
        />
        <View style={styles.loadingContainer}>
          <Typography variant="body" color="textSecondary">
            Loading...
          </Typography>
        </View>
      </ScreenLayout>
    );
  }

  const initials = selectedStaff.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <ScreenLayout edges={TAB_SCREEN_EDGES}>
      <AppHeader
        title="Staff Details"
        colors={[theme.primary, theme.primary]}
        onBack={onBack}
      />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarInset + Spacing.four }]}
      >
        {/* Profile Card */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <View style={styles.profileHeader}>
            <View style={styles.profileRow}>
              <Avatar
                initials={initials}
                imageUrl={selectedStaff.photoUrl}
                size={48}
              />
              <View style={styles.profileInfo}>
                <Typography variant="subtitle">{selectedStaff.name}</Typography>
                <Typography variant="caption" color="textSecondary">
                  {selectedStaff.role} · {selectedStaff.department}
                </Typography>
              </View>
            </View>
          </View>
          <View style={styles.actionButtonsRow}>
            <Pressable style={styles.actionButton} onPress={handleEdit}>
              <Feather name="edit" size={15} color={theme.text} />
              <Typography variant="caption">Edit details</Typography>
            </Pressable>
            <Pressable
              style={styles.actionButton}
              onPress={() => setStatusSheetVisible(true)}
              disabled={submitting}
            >
              <Feather name="sliders" size={15} color={theme.text} />
              <Typography variant="caption">Change status</Typography>
            </Pressable>
            <Pressable style={styles.actionButton} onPress={handleSetTarget}>
              <Feather name="target" size={15} color={theme.text} />
              <Typography variant="caption">Set target</Typography>
            </Pressable>
            <Pressable
              style={styles.actionButton}
              onPress={() => setDeleteConfirmVisible(true)}
              disabled={submitting}
            >
              <Feather name="trash-2" size={15} color={BrandColors.danger} />
              <Typography variant="caption" style={{ color: BrandColors.danger }}>Delete</Typography>
            </Pressable>
          </View>
        </View>

        {/* Contact Information Card */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <Typography variant="bodySmallBold" style={styles.cardTitle}>Contact information</Typography>
          <View style={styles.gridContainer}>
            <View style={styles.gridItem}>
              <Typography variant="caption" color="textSecondary">Employee ID</Typography>
              <Typography variant="bodySmall">{selectedStaff.id || `EMP-${staffId.slice(0, 5)}`}</Typography>
            </View>
            <View style={styles.gridItem}>
              <Typography variant="caption" color="textSecondary">Join date</Typography>
              <Typography variant="bodySmall">{selectedStaff.joinDate}</Typography>
            </View>
            <View style={styles.gridItem}>
              <Typography variant="caption" color="textSecondary">Phone</Typography>
              <Typography variant="bodySmall">{selectedStaff.phone}</Typography>
            </View>
            <View style={styles.gridItem}>
              <Typography variant="caption" color="textSecondary">Email</Typography>
              <Typography variant="bodySmall">{selectedStaff.email}</Typography>
            </View>
            <View style={styles.gridItemFull}>
              <Typography variant="caption" color="textSecondary">Address</Typography>
              <Typography variant="bodySmall">{selectedStaff.address}</Typography>
            </View>
          </View>
        </View>

        {/* Certifications Card */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <Typography variant="bodySmallBold" style={styles.cardTitle}>Certifications</Typography>
          {selectedStaff.certifications.length === 0 ? (
            <Typography variant="bodySmall" color="textSecondary">No certifications on file.</Typography>
          ) : (
            selectedStaff.certifications.map((cert, idx) => (
              <View key={idx} style={{ marginBottom: idx < selectedStaff.certifications.length - 1 ? Spacing.two : 0 }}>
                <Typography variant="bodySmall">{cert.certName}</Typography>
                <Typography variant="caption" color="textSecondary">
                  {cert.issuer} · {cert.issueDate} to {cert.expiryDate}
                </Typography>
              </View>
            ))
          )}
        </View>

        {/* Schedule Card */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <Typography variant="bodySmallBold" style={styles.cardTitle}>Schedule</Typography>
          {Object.keys(selectedStaff.schedule).length === 0 ? (
            <Typography variant="bodySmall" color="textSecondary">No shifts scheduled this week.</Typography>
          ) : (
            Object.entries(selectedStaff.schedule)
              .sort(([a], [b]) => weekdayRank(a) - weekdayRank(b))
              .map(([day, ranges]) => (
              <View key={day} style={styles.scheduleRow}>
                <Typography variant="bodySmall" style={{ width: 100 }}>{day}</Typography>
                <Typography variant="bodySmall" color="textSecondary">{ranges.join(', ')}</Typography>
              </View>
            ))
          )}
        </View>

        {/* Performance Card */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <Typography variant="bodySmallBold" style={styles.cardTitle}>Performance</Typography>
          <View style={styles.performanceGrid}>
            <View style={[styles.performanceBox, { backgroundColor: theme.background }]}>
              <Typography variant="caption" color="textSecondary">Sessions completed</Typography>
              <Typography variant="subtitle">0</Typography>
            </View>
            <View style={[styles.performanceBox, { backgroundColor: theme.background }]}>
              <Typography variant="caption" color="textSecondary">New clients</Typography>
              <Typography variant="subtitle">0</Typography>
            </View>
            <View style={[styles.performanceBox, { backgroundColor: theme.background }]}>
              <Typography variant="caption" color="textSecondary">Revenue generated</Typography>
              <Typography variant="subtitle"><CurrencyValue amount={0} /></Typography>
            </View>
            <View style={[styles.performanceBox, { backgroundColor: theme.background }]}>
              <Typography variant="caption" color="textSecondary">Commission earned</Typography>
              <Typography variant="subtitle"><CurrencyValue amount={0} /></Typography>
            </View>
          </View>
        </View>
      </ScrollView>

      <AppBottomSheet
        visible={statusSheetVisible}
        title="Change status"
        subtitle={selectedStaff.name}
        onClose={() => setStatusSheetVisible(false)}
      >
        {STATUS_OPTIONS.map((option) => {
          const isCurrent = selectedStaff.status?.toLowerCase() === option.value;
          return (
            <Pressable
              key={option.value}
              style={[
                styles.statusOption,
                { borderColor: isCurrent ? option.color : theme.border },
              ]}
              onPress={() => handleChangeStatus(option.value)}
            >
              <Feather name={option.icon} size={18} color={option.color} />
              <Typography variant="body" style={styles.statusOptionLabel}>
                {option.label}
              </Typography>
              {isCurrent && <Feather name="check" size={18} color={option.color} />}
            </Pressable>
          );
        })}
      </AppBottomSheet>

      <ConfirmationModal
        visible={deleteConfirmVisible}
        title="Delete Staff"
        message="Are you sure you want to delete this staff member? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        icon="trash-2"
        loading={submitting}
        onConfirm={handleDelete}
        onClose={() => setDeleteConfirmVisible(false)}
      />
    </ScreenLayout>
  );
}

// RoleTabsLayout already pads the top inset; the floating tab bar is cleared via padding.
const TAB_SCREEN_EDGES = ['left', 'right'] as const;

const styles = StyleSheet.create({
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderRadius: Radius.md,
    borderWidth: 0.5,
    padding: Spacing.four,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  profileInfo: {
    justifyContent: 'center',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.two,
  },
  statusOptionLabel: {
    flex: 1,
  },
  cardTitle: {
    marginBottom: Spacing.md,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  gridItem: {
    width: '48%',
  },
  gridItemFull: {
    width: '100%',
  },
  scheduleRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.one,
  },
  performanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  performanceBox: {
    width: '48%',
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
});