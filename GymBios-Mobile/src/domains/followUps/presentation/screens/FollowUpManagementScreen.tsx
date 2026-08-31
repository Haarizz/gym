import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Button } from '@/shared/components/Button';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import type { FollowUp } from '../../domain/FollowUp';
import type { FollowUpFilters as FollowUpFiltersType } from '../../domain/FollowUpFilters';
import type { FollowUpRequest } from '../../domain/FollowUpRequest';
import {
  useCancelFollowUp,
  useCompleteFollowUp,
  useCreateFollowUp,
  useDeleteFollowUp,
  useRescheduleFollowUp,
  useUpdateFollowUp,
} from '../../hooks/useFollowUpMutations';
import { useFollowUps, useFollowUpStats } from '../../hooks/useFollowUps';
import { AddFollowUpSheet } from '../components/AddFollowUpSheet';
import { CompleteFollowUpSheet } from '../components/CompleteFollowUpSheet';
import { FollowUpDetailsSheet } from '../components/FollowUpDetailsSheet';
import { FollowUpFilters } from '../components/FollowUpFilters';
import { FollowUpList } from '../components/FollowUpList';
import { RescheduleFollowUpSheet } from '../components/RescheduleFollowUpSheet';

import { toast } from '@/shared/components/Toasts/toastStore';

export function FollowUpManagementScreen() {
  const theme = useTheme();

  // State
  const [filters, setFilters] = useState<FollowUpFiltersType>({ page: 1, size: 50 });
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUp | null>(null);
  const [detailFollowUpId, setDetailFollowUpId] = useState<number | null>(null);
  const [detailSheetVisible, setDetailSheetVisible] = useState(false);

  const [completingFollowUp, setCompletingFollowUp] = useState<FollowUp | null>(null);
  const [completeSheetVisible, setCompleteSheetVisible] = useState(false);

  const [reschedulingFollowUp, setReschedulingFollowUp] = useState<FollowUp | null>(null);
  const [rescheduleSheetVisible, setRescheduleSheetVisible] = useState(false);

  // Queries
  const {
    data: followUpsData,
    isLoading: loadingFollowUps,
    isRefetching,
    error: followUpsError,
    refetch: refetchFollowUps,
  } = useFollowUps(filters);

  const { data: statsData, refetch: refetchStats } = useFollowUpStats();

  // Mutations
  const createMutation = useCreateFollowUp();
  const updateMutation = useUpdateFollowUp();
  const deleteMutation = useDeleteFollowUp();
  const completeMutation = useCompleteFollowUp();
  const cancelMutation = useCancelFollowUp();
  const rescheduleMutation = useRescheduleFollowUp();

  const followUps = useMemo(() => followUpsData?.followUps ?? [], [followUpsData]);

  // Pull to refresh
  const handleRefresh = useCallback(() => {
    refetchFollowUps();
    refetchStats();
  }, [refetchFollowUps, refetchStats]);

  // Quick Action Handlers
  const handleCall = useCallback((followUp: FollowUp) => {
    if (!followUp.leadPhone) {
      toast.info('This lead does not have a phone number recorded.', {
        title: 'No Phone Number'
      });
      return;
    }
    Linking.openURL(`tel:${followUp.leadPhone.replace(/\s+/g, '')}`).catch(() => {
      toast.error('Unable to launch phone dialer on this device.', {
        title: 'Error'
      });
    });
  }, []);

  const handleEmail = useCallback((followUp: FollowUp) => {
    if (!followUp.leadEmail) {
      toast.info('This lead does not have an email address recorded.', {
        title: 'No Email Address'
      });
      return;
    }
    Linking.openURL(`mailto:${followUp.leadEmail}`).catch(() => {
      toast.error('Unable to launch mail client on this device.', {
        title: 'Error'
      });
    });
  }, []);

  const handleView = useCallback((followUp: FollowUp) => {
    setDetailFollowUpId(followUp.id);
    setDetailSheetVisible(true);
  }, []);

  const handleEdit = useCallback((followUp: FollowUp) => {
    setEditingFollowUp(followUp);
    setAddSheetVisible(true);
  }, []);

  const handleDelete = useCallback(
    (followUp: FollowUp) => {
      Alert.alert(
        'Delete Follow-up',
        `Are you sure you want to delete the follow-up "${followUp.subject}" for ${followUp.leadName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              deleteMutation.mutate(followUp.id, {
                onError: err => {
                  toast.error(err.message || 'Failed to delete follow-up.', {
                    title: 'Error'
                  });
                },
              });
            },
          },
        ],
      );
    },
    [deleteMutation],
  );

  const handleCancelAction = useCallback(
    (followUp: FollowUp) => {
      Alert.alert(
        'Cancel Follow-up',
        `Are you sure you want to cancel the follow-up "${followUp.subject}"?`,
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes, Cancel',
            style: 'destructive',
            onPress: () => {
              cancelMutation.mutate(followUp.id, {
                onError: err => {
                  toast.error(err.message || 'Failed to cancel follow-up.', {
                    title: 'Error'
                  });
                },
              });
            },
          },
        ],
      );
    },
    [cancelMutation],
  );

  const handleCompleteAction = useCallback((followUp: FollowUp) => {
    setCompletingFollowUp(followUp);
    setCompleteSheetVisible(true);
  }, []);

  const handleRescheduleAction = useCallback((followUp: FollowUp) => {
    setReschedulingFollowUp(followUp);
    setRescheduleSheetVisible(true);
  }, []);

  // Form Submissions
  const handleAddOrEditSubmit = (request: FollowUpRequest) => {
    if (editingFollowUp) {
      updateMutation.mutate(
        { id: editingFollowUp.id, request },
        {
          onSuccess: () => {
            setAddSheetVisible(false);
            setEditingFollowUp(null);
          },
          onError: err => {
            toast.error(err.message || 'Failed to update follow-up.', {
              title: 'Error'
            });
          },
        },
      );
    } else {
      createMutation.mutate(request, {
        onSuccess: () => {
          setAddSheetVisible(false);
        },
        onError: err => {
          toast.error(err.message || 'Failed to create follow-up.', {
            title: 'Error'
          });
        },
      });
    }
  };

  const handleCompleteSubmit = (outcome: string, notes: string) => {
    if (!completingFollowUp) return;
    completeMutation.mutate(
      {
        id: completingFollowUp.id,
        request: { outcome, notes },
      },
      {
        onSuccess: () => {
          setCompleteSheetVisible(false);
          setCompletingFollowUp(null);
        },
        onError: err => {
          toast.error(err.message || 'Failed to complete follow-up.', {
            title: 'Error'
          });
        },
      },
    );
  };

  const handleRescheduleSubmit = (dueDate: string) => {
    if (!reschedulingFollowUp) return;
    rescheduleMutation.mutate(
      {
        id: reschedulingFollowUp.id,
        request: { dueDate },
      },
      {
        onSuccess: () => {
          setRescheduleSheetVisible(false);
          setReschedulingFollowUp(null);
        },
        onError: err => {
          toast.error(err.message || 'Failed to reschedule follow-up.', {
            title: 'Error'
          });
        },
      },
    );
  };

  // Header Component with 8 KPI Summary Cards & Filter Bar
  const renderHeaderComponent = () => (
    <View style={styles.headerContainer}>
      {/* Title & Action Button */}
      <View style={styles.titleRow}>
        <View style={styles.titleTextContainer}>
          <Text style={[styles.screenTitle, { color: theme.text }]}>
            Follow-ups Management
          </Text>
          <Text style={[styles.screenSubtitle, { color: theme.textSecondary }]}>
            Comprehensive member management and operations.
          </Text>
        </View>

        <Button
          label="+ Follow-up"
          size="md"
          onPress={() => {
            setEditingFollowUp(null);
            setAddSheetVisible(true);
          }}
        />
      </View>

      {/* KPI Stats Scroll */}
      {statsData && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsScroll}
        >
          <View style={[styles.kpiCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.kpiHeader}>
              <Text style={[styles.kpiTitle, { color: BrandColors.teal }]}>Total</Text>
              <Feather name="users" size={14} color={BrandColors.teal} />
            </View>
            <Text style={[styles.kpiValue, { color: theme.text }]}>
              {statsData.totalFollowUps ?? 0}
            </Text>
            <Text style={[styles.kpiSubtitle, { color: theme.textSecondary }]}>
              All follow-ups
            </Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.kpiHeader}>
              <Text style={[styles.kpiTitle, { color: '#2563eb' }]}>Pending</Text>
              <Feather name="clock" size={14} color="#2563eb" />
            </View>
            <Text style={[styles.kpiValue, { color: '#2563eb' }]}>
              {statsData.pendingFollowUps ?? 0}
            </Text>
            <Text style={[styles.kpiSubtitle, { color: theme.textSecondary }]}>
              Awaiting action
            </Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.kpiHeader}>
              <Text style={[styles.kpiTitle, { color: '#dc2626' }]}>Overdue</Text>
              <Feather name="alert-triangle" size={14} color="#dc2626" />
            </View>
            <Text style={[styles.kpiValue, { color: '#dc2626' }]}>
              {statsData.overdueFollowUps ?? 0}
            </Text>
            <Text style={[styles.kpiSubtitle, { color: theme.textSecondary }]}>
              Past due date
            </Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.kpiHeader}>
              <Text style={[styles.kpiTitle, { color: '#ea580c' }]}>Completed</Text>
              <Feather name="check-circle" size={14} color="#ea580c" />
            </View>
            <Text style={[styles.kpiValue, { color: '#ea580c' }]}>
              {statsData.completedFollowUps ?? 0}
            </Text>
            <Text style={[styles.kpiSubtitle, { color: theme.textSecondary }]}>
              Finished tasks
            </Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.kpiHeader}>
              <Text style={[styles.kpiTitle, { color: '#d97706' }]}>Rescheduled</Text>
              <Feather name="calendar" size={14} color="#d97706" />
            </View>
            <Text style={[styles.kpiValue, { color: '#d97706' }]}>
              {statsData.rescheduledFollowUps ?? 0}
            </Text>
            <Text style={[styles.kpiSubtitle, { color: theme.textSecondary }]}>
              Moved dates
            </Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.kpiHeader}>
              <Text style={[styles.kpiTitle, { color: '#6b7280' }]}>Cancelled</Text>
              <Feather name="x-circle" size={14} color="#6b7280" />
            </View>
            <Text style={[styles.kpiValue, { color: '#6b7280' }]}>
              {statsData.cancelledFollowUps ?? 0}
            </Text>
            <Text style={[styles.kpiSubtitle, { color: theme.textSecondary }]}>
              Cancelled tasks
            </Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.kpiHeader}>
              <Text style={[styles.kpiTitle, { color: '#16a34a' }]}>Success Rate</Text>
              <Feather name="trending-up" size={14} color="#16a34a" />
            </View>
            <Text style={[styles.kpiValue, { color: '#16a34a' }]}>
              {(statsData.completionRate ?? 0).toFixed(1)}%
            </Text>
            <Text style={[styles.kpiSubtitle, { color: theme.textSecondary }]}>
              Completion rate
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Search & Filters */}
      <FollowUpFilters filters={filters} onChangeFilters={setFilters} />
    </View>
  );

  return (
    <ScreenLayout>
      <FollowUpList
        followUps={followUps}
        loading={loadingFollowUps}
        error={followUpsError}
        refreshing={isRefetching}
        onRefresh={handleRefresh}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onComplete={handleCompleteAction}
        onReschedule={handleRescheduleAction}
        onCancel={handleCancelAction}
        onCall={handleCall}
        onEmail={handleEmail}
        ListHeaderComponent={renderHeaderComponent()}
      />

      {/* Detail BottomSheet */}
      <FollowUpDetailsSheet
        visible={detailSheetVisible}
        followUpId={detailFollowUpId}
        onClose={() => setDetailSheetVisible(false)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onComplete={handleCompleteAction}
        onReschedule={handleRescheduleAction}
        onCancel={handleCancelAction}
      />

      {/* Add / Edit Sheet */}
      <AddFollowUpSheet
        visible={addSheetVisible}
        editingFollowUp={editingFollowUp}
        onClose={() => {
          setAddSheetVisible(false);
          setEditingFollowUp(null);
        }}
        onSubmit={handleAddOrEditSubmit}
        submitting={createMutation.isPending || updateMutation.isPending}
      />

      {/* Complete Sheet */}
      <CompleteFollowUpSheet
        visible={completeSheetVisible}
        followUp={completingFollowUp}
        onClose={() => {
          setCompleteSheetVisible(false);
          setCompletingFollowUp(null);
        }}
        onSubmit={handleCompleteSubmit}
        submitting={completeMutation.isPending}
      />

      {/* Reschedule Sheet */}
      <RescheduleFollowUpSheet
        visible={rescheduleSheetVisible}
        followUp={reschedulingFollowUp}
        onClose={() => {
          setRescheduleSheetVisible(false);
          setReschedulingFollowUp(null);
        }}
        onSubmit={handleRescheduleSubmit}
        submitting={rescheduleMutation.isPending}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    marginBottom: Spacing.two,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: Spacing.two,
  },
  titleTextContainer: {
    flex: 1,
    paddingRight: Spacing.two,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  screenSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  statsScroll: {
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  kpiCard: {
    width: 130,
    padding: Spacing.three,
    borderRadius: Radius.lg,
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  kpiTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  kpiSubtitle: {
    fontSize: 10,
    marginTop: 2,
  },
});
