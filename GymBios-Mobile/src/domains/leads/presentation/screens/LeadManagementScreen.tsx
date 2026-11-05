import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/components/AppText';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { useStaff } from '@/domains/hr/presentation/hooks/useStaff';
import { Dropdown } from '@/shared/components/Dropdown';
import { Pagination } from '@/shared/components/Pagination';
import { Typography } from '@/shared/components/Typography';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import type { Lead, LeadStatus } from '../../domain/Lead';
import type { LeadFilters as LeadFiltersType } from '../../domain/LeadFilters';
import {
  useCreateLead,
  useDeleteLead,
  useUpdateLead,
  useUpdateLeadStatus,
} from '../../hooks/useLeadMutations';
import { useLeads, useLeadStats } from '../../hooks/useLeads';
import { LeadDetailsSheet } from '../components/LeadDetailsSheet';
import { LeadFilters } from '../components/LeadFilters';
import { LeadFormSheet, type LeadFormValues } from '../components/LeadFormSheet';
import { LeadList } from '../components/LeadList';
import { LeadSelectionToolbar } from '../components/LeadSelectionToolbar';
import { registerLeadAsMember } from '../navigation/registerLeadAsMember';
import { useLeadSelection } from '../hooks/useLeadSelection';

import { toast } from '@/shared/components/Toasts/toastStore';
import { useBranchContext } from '@/shared/providers/BranchProvider';

interface LeadManagementScreenProps {
  onNavigateToDetail?: (lead: Lead) => void;
  onNavigateToCreate?: () => void;
}

// RoleTabsLayout already pads the top inset and the list pads past the tab bar.
const TAB_SCREEN_EDGES = ['left', 'right'] as const;

const ALL_STATUSES: LeadStatus[] = [
  'new',
  'contacted',
  'follow-up',
  'converted',
  'lost',
];

export function LeadManagementScreen({
  onNavigateToDetail,
  onNavigateToCreate,
}: LeadManagementScreenProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { selectedBranchId } = useBranchContext();

  const getStatusLabel = useCallback((status: LeadStatus) => {
    switch (status) {
      case 'new': return t('leads.statuses.new');
      case 'contacted': return t('leads.statuses.contacted');
      case 'follow-up': return t('leads.statuses.followUp');
      case 'converted': return t('leads.statuses.converted');
      case 'lost': return t('leads.statuses.lost');
      default: return status;
    }
  }, [t]);

  // State
  const [filters, setFilters] = useState<LeadFiltersType>({ page: 1, size: 50 });
  const [formSheetVisible, setFormSheetVisible] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [bulkStatusModalVisible, setBulkStatusModalVisible] = useState(false);
  const [bulkAssignModalVisible, setBulkAssignModalVisible] = useState(false);

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const [bulkStaffName, setBulkStaffName] = useState('');
  const router = useRouter();
  const handleRegisterMember = useCallback(
    (lead: Lead) => registerLeadAsMember(router, lead),
    [router],
  );

  // Domain & Query Hooks
  const { staff } = useStaff();
  const staffOptions = useMemo(() => {
    const options = (staff || []).map(s => ({
      label: s.name ? `${s.name}${s.role ? ` (${s.role})` : ''}` : s.email,
      value: s.name || s.email,
    }));
    return [{ label: t('leads.management.unassigned'), value: '' }, ...options];
  }, [staff, t]);

  const {
    data: leadsData,
    isLoading: loadingLeads,
    isRefetching,
    error: leadsError,
    refetch: refetchLeads,
  } = useLeads(filters);

  const { data: statsData, refetch: refetchStats } = useLeadStats();

  const createMutation = useCreateLead();
  const updateMutation = useUpdateLead();
  const updateStatusMutation = useUpdateLeadStatus();
  const deleteMutation = useDeleteLead();

  // Selection Hook
  const {
    selectedLeadIds,
    selectedCount,
    isSelected,
    toggleSelection,
    clearSelection,
  } = useLeadSelection();

  const leads = useMemo(() => leadsData?.leads ?? [], [leadsData]);

  // Pull to refresh handler
  const handleRefresh = useCallback(() => {
    refetchLeads();
    refetchStats();
  }, [refetchLeads, refetchStats]);

  // Direct Lead Action Handlers
  const handleCall = useCallback((lead: Lead) => {
    if (!lead.phone) {
      toast.info(t('leads.actions.noPhoneMessage'), {
        title: t('leads.actions.noPhoneTitle'),
      });
      return;
    }
    Linking.openURL(`tel:${lead.phone.replace(/\s+/g, '')}`).catch(() => {
      toast.error(t('leads.actions.phoneError'), {
        title: t('common.error'),
      });
    });
  }, [t]);

  const handleEmail = useCallback((lead: Lead) => {
    if (!lead.email) {
      toast.info(t('leads.actions.noEmailMessage'), {
        title: t('leads.actions.noEmailTitle'),
      });
      return;
    }
    Linking.openURL(`mailto:${lead.email}`).catch(() => {
      toast.error(t('leads.actions.emailError'), {
        title: t('common.error'),
      });
    });
  }, [t]);

  const handleMessage = useCallback((lead: Lead) => {
    if (!lead.phone) {
      toast.info(t('leads.actions.noPhoneMessage'), {
        title: t('leads.actions.noPhoneTitle'),
      });
      return;
    }
    Linking.openURL(`sms:${lead.phone.replace(/\s+/g, '')}`).catch(() => {
      toast.error(t('leads.actions.messageError'), {
        title: t('common.error'),
      });
    });
  }, [t]);

  const handleView = useCallback(
    (lead: Lead) => {
      if (onNavigateToDetail) {
        onNavigateToDetail(lead);
      } else {
        setSelectedLead(lead);
        setDetailModalVisible(true);
      }
    },
    [onNavigateToDetail],
  );

  const handleEdit = useCallback((lead: Lead) => {
    setEditingLead(lead);
    setFormSheetVisible(true);
  }, []);

  const handleDelete = useCallback(
    (lead: Lead) => {
      Alert.alert(
        t('leads.management.deleteLeadTitle'),
        t('leads.management.deleteLeadConfirm', {
          name: `${lead.firstName} ${lead.lastName}`.trim() || t('leads.management.unnamedLead'),
        }),
        [
          { text: t('leads.management.cancel'), style: 'cancel' },
          {
            text: t('leads.management.delete'),
            style: 'destructive',
            onPress: () => {
              deleteMutation.mutate(lead.id, {
                onSuccess: () => {
                  if (isSelected(lead.id)) toggleSelection(lead.id);
                },
                onError: err => {
                  toast.error(err.message || t('leads.management.deleteError'), {
                    title: t('common.error'),
                  });
                },
              });
            },
          },
        ],
      );
    },
    [deleteMutation, isSelected, t, toggleSelection],
  );

  const closeFormSheet = useCallback(() => {
    setFormSheetVisible(false);
    setEditingLead(null);
  }, []);

  const handleFormSubmit = (values: LeadFormValues) => {
    if (!editingLead) {
      createMutation.mutate(values, {
        onSuccess: closeFormSheet,
        onError: err => {
          toast.error(err.message || t('leads.management.createError'), {
            title: t('common.error'),
          });
        },
      });
      return;
    }

    // Marking a lead converted only flips its status — like the web, offer to register the
    // member right away so the sale is recorded and credited to the lead's staff.
    const newlyConverted =
      values.status === 'converted' && editingLead.status !== 'converted' && !editingLead.memberId;
    const convertedLead: Lead = { ...editingLead, ...values };

    updateMutation.mutate(
      { id: editingLead.id, request: values },
      {
        onSuccess: () => {
          closeFormSheet();
          if (newlyConverted) {
            Alert.alert(
              t('leads.management.registerPromptTitle'),
              t('leads.management.registerPromptMessage', { name: convertedLead.firstName }),
              [
                { text: t('leads.management.registerLater'), style: 'cancel' },
                { text: t('leads.management.registerNow'), onPress: () => handleRegisterMember(convertedLead) },
              ],
            );
          }
        },
        onError: err => {
          toast.error(err.message || t('leads.management.updateError'), {
            title: t('common.error'),
          });
        },
      },
    );
  };

  // Bulk Actions
  const handleBulkStatusApply = async (status: LeadStatus) => {
    setBulkStatusModalVisible(false);
    try {
      await Promise.all(
        selectedLeadIds.map(id =>
          updateStatusMutation.mutateAsync({ id, status }),
        ),
      );
      clearSelection();
    } catch (err: any) {
      toast.error(err.message || t('leads.management.bulkStatusError'), {
        title: t('common.error'),
      });
    }
  };

  const handleBulkAssignApply = async () => {
    if (!bulkStaffName.trim()) {
      toast.error(t('leads.management.selectStaffPlaceholder'), {
        title: t('leads.form.validationErrorTitle'),
      });
      return;
    }
    setBulkAssignModalVisible(false);
    try {
      await Promise.all(
        selectedLeadIds.map(id => {
          const lead = leads.find(l => l.id === id);
          if (!lead) return Promise.resolve();
          return updateMutation.mutateAsync({
            id,
            request: {
              firstName: lead.firstName,
              lastName: lead.lastName,
              email: lead.email,
              phone: lead.phone,
              status: lead.status,
              source: lead.source,
              priority: lead.priority,
              assignedStaff: bulkStaffName.trim(),
            },
          });
        }),
      );
      setBulkStaffName('');
      clearSelection();
    } catch (err: any) {
      toast.error(err.message || t('leads.management.bulkAssignError'), {
        title: t('common.error'),
      });
    }
  };

  const handleBulkDelete = useCallback(() => {
    Alert.alert(
      t('leads.management.bulkDeleteTitle'),
      t('leads.management.bulkDeleteConfirm', { count: selectedCount }),
      [
        { text: t('leads.management.cancel'), style: 'cancel' },
        {
          text: t('leads.management.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all(selectedLeadIds.map(id => deleteMutation.mutateAsync(id)));
              clearSelection();
            } catch (err: any) {
              toast.error(err.message || t('leads.management.bulkDeleteError'), {
                title: t('common.error'),
              });
            }
          },
        },
      ],
    );
  }, [selectedCount, selectedLeadIds, deleteMutation, clearSelection, t]);

  const openCreateModal = useCallback(() => {
    if (selectedBranchId === 'ALL') {
      toast.error(t('leads.management.branchRequired'), {
        title: t('leads.management.branchRequiredTitle'),
      });
      return;
    }
    if (onNavigateToCreate) {
      onNavigateToCreate();
    } else {
      setEditingLead(null);
      setFormSheetVisible(true);
    }
  }, [selectedBranchId, onNavigateToCreate, t]);

  const kpis = useMemo(
    () => [
      { key: 'total', label: t('leads.management.totalLeads'), value: statsData?.totalLeads, color: theme.text },
      { key: 'new', label: t('leads.management.newLeads'), value: statsData?.newLeads, color: '#3b82f6' },
      { key: 'contacted', label: t('leads.management.contactedLeads'), value: statsData?.contactedLeads, color: '#eab308' },
      { key: 'converted', label: t('leads.management.convertedLeads'), value: statsData?.convertedLeads, color: '#16a34a' },
      {
        key: 'rate',
        label: t('leads.management.conversionRate'),
        value: statsData ? `${(statsData.conversionRate ?? 0).toFixed(1)}%` : undefined,
        color: BrandColors.teal,
      },
    ],
    [statsData, theme.text, t],
  );

  // Must be an element, not a component: a component whose identity changes on
  // every keystroke is remounted by FlatList, which drops focus from the search input.
  const listHeader = useMemo(
    () => (
      <View style={styles.headerContainer}>
        <LeadFilters filters={filters} onChangeFilters={setFilters} />

        {/* KPI cards: 3 on the first row, 2 wider ones on the second */}
        {[kpis.slice(0, 3), kpis.slice(3)].map((row, i) => (
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

        <LeadSelectionToolbar
          selectedCount={selectedCount}
          onAssignStaff={() => setBulkAssignModalVisible(true)}
          onUpdateStatus={() => setBulkStatusModalVisible(true)}
          onDelete={handleBulkDelete}
          onClear={clearSelection}
        />
      </View>
    ),
    [filters, kpis, theme, selectedCount, handleBulkDelete, clearSelection],
  );

  const listFooter = useMemo(
    () => (
      <View style={styles.footer}>
        <Pagination
          currentPage={filters.page ?? 1}
          totalPages={leadsData?.pagination?.totalPages ?? 1}
          onPageChange={page => setFilters(prev => ({ ...prev, page }))}
        />
        <Pressable
          style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
          onPress={openCreateModal}
          accessibilityRole="button"
        >
          <Feather name="plus" size={18} color={BrandColors.white} />
          <Typography variant="bodySmallBold" style={styles.addButtonLabel}>
            {t('leads.form.addNewLead')}
          </Typography>
        </Pressable>
      </View>
    ),
    [filters.page, leadsData?.pagination?.totalPages, openCreateModal, t],
  );

  return (
    <ScreenLayout edges={TAB_SCREEN_EDGES}>
      <LeadList
        leads={leads}
        loading={loadingLeads}
        error={leadsError}
        refreshing={isRefetching}
        onRefresh={handleRefresh}
        isSelected={isSelected}
        onToggleSelect={toggleSelection}
        onCall={handleCall}
        onEmail={handleEmail}
        onMessage={handleMessage}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        emptyActionLabel={filters.search || filters.status || filters.priority || filters.source
          ? undefined
          : t('leads.form.addNewLead')}
        onEmptyAction={openCreateModal}
      />

      {/* Lead Detail BottomSheet Component */}
      <LeadDetailsSheet
        visible={detailModalVisible}
        leadId={selectedLead?.id ?? null}
        onClose={() => setDetailModalVisible(false)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRegisterMember={handleRegisterMember}
      />

      {/* Create / Edit Lead Sheet */}
      <LeadFormSheet
        visible={formSheetVisible}
        lead={editingLead}
        staffOptions={staffOptions}
        submitting={createMutation.isPending || updateMutation.isPending}
        onClose={closeFormSheet}
        onSubmit={handleFormSubmit}
      />

      {/* Bulk Status Update Modal */}
      <Modal
        visible={bulkStatusModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setBulkStatusModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setBulkStatusModalVisible(false)}
        >
          <Pressable
            style={[styles.modalSheet, { backgroundColor: theme.background }]}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {t('leads.management.bulkUpdateStatusTitle', { count: selectedCount })}
              </Text>
              <TouchableOpacity onPress={() => setBulkStatusModalVisible(false)}>
                <Feather name="x" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {ALL_STATUSES.map(statusOption => (
                <TouchableOpacity
                  key={statusOption}
                  style={[
                    styles.statusSelectOption,
                    { backgroundColor: theme.backgroundElement },
                  ]}
                  onPress={() => handleBulkStatusApply(statusOption)}
                >
                  <Text style={[styles.statusSelectOptionText, { color: theme.text }]}>
                    {t('leads.management.setAsStatus', { status: getStatusLabel(statusOption) })}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Bulk Assign Staff Modal */}
      <Modal
        visible={bulkAssignModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setBulkAssignModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setBulkAssignModalVisible(false)}
        >
          <Pressable
            style={[styles.modalSheet, { backgroundColor: theme.background }]}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {t('leads.management.bulkAssignStaffTitle', { count: selectedCount })}
              </Text>
              <TouchableOpacity onPress={() => setBulkAssignModalVisible(false)}>
                <Feather name="x" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Dropdown
                label={t('leads.details.staffMember')}
                placeholder={t('leads.management.selectStaffPlaceholder')}
                value={bulkStaffName}
                options={staffOptions}
                onChange={setBulkStaffName}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.clearBtn, { borderColor: theme.border }]}
                onPress={() => setBulkAssignModalVisible(false)}
              >
                <Text style={[styles.clearBtnText, { color: theme.textSecondary }]}>
                  {t('leads.management.cancel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.applyBtn} onPress={handleBulkAssignApply}>
                <Text style={styles.applyBtnText}>{t('leads.management.assignBtn')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '85%',
    padding: Spacing.four,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    marginBottom: Spacing.three,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  clearBtn: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  clearBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  applyBtn: {
    flex: 1,
    backgroundColor: BrandColors.teal,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  statusSelectOption: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    marginBottom: Spacing.two,
  },
  statusSelectOptionText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
