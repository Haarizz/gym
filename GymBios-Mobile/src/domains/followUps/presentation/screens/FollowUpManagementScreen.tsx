import Feather from '@expo/vector-icons/Feather';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Pagination } from '@/shared/components/Pagination';
import { Typography } from '@/shared/components/Typography';
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

// RoleTabsLayout already pads the top inset and the list pads past the tab bar.
const TAB_SCREEN_EDGES = ['left', 'right'] as const;

export function FollowUpManagementScreen() {
  const { t } = useTranslation();
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
      toast.info(t('followUps.msg.leadNoPhone'), {
        title: t('common.noPhoneNumber')
      });
      return;
    }
    Linking.openURL(`tel:${followUp.leadPhone.replace(/\s+/g, '')}`).catch(() => {
      toast.error(t('common.cannotOpenDialer'), {
        title: t('common.error')
      });
    });
  }, [t]);

  const handleEmail = useCallback((followUp: FollowUp) => {
    if (!followUp.leadEmail) {
      toast.info(t('followUps.msg.leadNoEmail'), {
        title: t('common.noEmailAddress')
      });
      return;
    }
    Linking.openURL(`mailto:${followUp.leadEmail}`).catch(() => {
      toast.error(t('common.cannotOpenMail'), {
        title: t('common.error')
      });
    });
  }, [t]);

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
        t('followUps.msg.deleteTitle'),
        t('followUps.msg.deleteBody', { subject: followUp.subject, name: followUp.leadName }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: () => {
              deleteMutation.mutate(followUp.id, {
                onError: err => {
                  toast.error(err.message || t('followUps.msg.deleteFailed'), {
                    title: t('common.error')
                  });
                },
              });
            },
          },
        ],
      );
    },
    [deleteMutation, t],
  );

  const handleCancelAction = useCallback(
    (followUp: FollowUp) => {
      Alert.alert(
        t('followUps.msg.cancelTitle'),
        t('followUps.msg.cancelBody', { subject: followUp.subject }),
        [
          { text: t('common.no'), style: 'cancel' },
          {
            text: t('followUps.msg.yesCancel'),
            style: 'destructive',
            onPress: () => {
              cancelMutation.mutate(followUp.id, {
                onError: err => {
                  toast.error(err.message || t('followUps.msg.cancelFailed'), {
                    title: t('common.error')
                  });
                },
              });
            },
          },
        ],
      );
    },
    [cancelMutation, t],
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
            toast.error(err.message || t('followUps.msg.updateFailed'), {
              title: t('common.error')
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
          toast.error(err.message || t('followUps.msg.createFailed'), {
            title: t('common.error')
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
          if (outcome === 'converted') {
            // The lead now counts as a conversion, but revenue only moves once the member
            // is registered and pays — which happens at the front desk, not in the app.
            toast.success(t('followUps.msg.leadConvertedBody'), {
              title: t('followUps.msg.leadConvertedTitle')
            });
          }
        },
        onError: err => {
          toast.error(err.message || t('followUps.msg.completeFailed'), {
            title: t('common.error')
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
          toast.error(err.message || t('followUps.msg.rescheduleFailed'), {
            title: t('common.error')
          });
        },
      },
    );
  };

  const openCreateSheet = useCallback(() => {
    setEditingFollowUp(null);
    setAddSheetVisible(true);
  }, []);

  // Six KPI tiles in two rows of three (cancelled count is reachable via the status filter).
  const kpiRows = useMemo(() => {
    const kpis = [
      { key: 'total', label: t('followUps.total'), value: statsData?.totalFollowUps, color: theme.text },
      { key: 'pending', label: t('followUps.pending'), value: statsData?.pendingFollowUps, color: '#2563eb' },
      { key: 'overdue', label: t('followUps.overdue'), value: statsData?.overdueFollowUps, color: '#dc2626' },
      {
        key: 'completed',
        label: t('followUps.completed'),
        value: statsData?.completedFollowUps,
        color: '#16a34a',
      },
      {
        key: 'rescheduled',
        label: t('followUps.rescheduled'),
        value: statsData?.rescheduledFollowUps,
        color: '#d97706',
      },
      {
        key: 'rate',
        label: t('followUps.successRate'),
        value: statsData ? `${(statsData.completionRate ?? 0).toFixed(1)}%` : undefined,
        color: BrandColors.teal,
      },
    ];
    return [kpis.slice(0, 3), kpis.slice(3)];
  }, [statsData, theme.text, t]);

  // Must be an element, not a component: a component whose identity changes on
  // every keystroke is remounted by FlatList, which drops focus from the search input.
  const listHeader = useMemo(
    () => (
      <View style={styles.headerContainer}>
        <FollowUpFilters filters={filters} onChangeFilters={setFilters} />

        {kpiRows.map((row, i) => (
          <View key={i} style={styles.summaryRow}>
            {row.map(kpi => (
              <View
                key={kpi.key}
                style={[styles.summaryCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
              >
                <Typography variant="caption" color="textSecondary" style={styles.summaryLabel} numberOfLines={1}>
                  {kpi.label}
                </Typography>
                <Typography variant="subtitle" style={[styles.summaryValue, { color: kpi.color }]}>
                  {kpi.value ?? '—'}
                </Typography>
              </View>
            ))}
          </View>
        ))}
      </View>
    ),
    [filters, kpiRows, theme],
  );

  const listFooter = useMemo(
    () => (
      <View style={styles.footer}>
        <Pagination
          currentPage={filters.page ?? 1}
          totalPages={followUpsData?.pagination?.totalPages ?? 1}
          onPageChange={page => setFilters(prev => ({ ...prev, page }))}
        />
        <Pressable
          style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
          onPress={openCreateSheet}
          accessibilityRole="button"
        >
          <Feather name="plus" size={18} color={BrandColors.white} />
          <Typography variant="bodySmallBold" style={styles.addButtonLabel}>
            {t('followUps.form.addButton')}
          </Typography>
        </Pressable>
      </View>
    ),
    [filters.page, followUpsData?.pagination?.totalPages, openCreateSheet, t],
  );

  const hasActiveFilters = !!(filters.search || filters.status || filters.type || filters.priority || filters.assignedStaff);

  return (
    <ScreenLayout edges={TAB_SCREEN_EDGES}>
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
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        emptyActionLabel={hasActiveFilters ? undefined : t('followUps.form.addButton')}
        onEmptyAction={openCreateSheet}
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
    paddingTop: Spacing.three,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  summaryCard: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    padding: Spacing.md,
  },
  summaryLabel: {
    marginBottom: Spacing.one,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '600',
  },
  footer: {
    gap: Spacing.three,
    paddingTop: Spacing.one,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: BrandColors.teal,
  },
  addButtonPressed: {
    backgroundColor: BrandColors.tealDark,
  },
  addButtonLabel: {
    color: BrandColors.white,
  },
});
