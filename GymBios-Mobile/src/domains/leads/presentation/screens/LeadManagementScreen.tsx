import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, TextInput } from '@/shared/components/AppText';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { useStaff } from '@/domains/hr/presentation/hooks/useStaff';
import { Button } from '@/shared/components/Button';
import { Dropdown } from '@/shared/components/Dropdown';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import type { Lead, LeadPriority, LeadSource, LeadStatus } from '../../domain/Lead';
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

  const statusOptions = useMemo(() => [
    { label: t('leads.statuses.new'), value: 'new' },
    { label: t('leads.statuses.contacted'), value: 'contacted' },
    { label: t('leads.statuses.followUp'), value: 'follow-up' },
    { label: t('leads.statuses.converted'), value: 'converted' },
    { label: t('leads.statuses.lost'), value: 'lost' },
  ], [t]);

  const priorityOptions = useMemo(() => [
    { label: t('leads.priorities.high'), value: 'high' },
    { label: t('leads.priorities.medium'), value: 'medium' },
    { label: t('leads.priorities.low'), value: 'low' },
  ], [t]);

  const sourceOptions = useMemo(() => [
    { label: t('leads.sources.website'), value: 'website' },
    { label: t('leads.sources.referral'), value: 'referral' },
    { label: t('leads.sources.walkIn'), value: 'walk-in' },
    { label: t('leads.sources.socialMedia'), value: 'social-media' },
    { label: t('leads.sources.phone'), value: 'phone' },
    { label: t('leads.sources.campaign'), value: 'campaign' },
    { label: t('leads.sources.other'), value: 'other' },
  ], [t]);

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
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [bulkStatusModalVisible, setBulkStatusModalVisible] = useState(false);
  const [bulkAssignModalVisible, setBulkAssignModalVisible] = useState(false);

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Form States
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formStatus, setFormStatus] = useState<LeadStatus>('new');
  const [formSource, setFormSource] = useState<LeadSource>('website');
  const [formPriority, setFormPriority] = useState<LeadPriority>('medium');
  const [formAssignedStaff, setFormAssignedStaff] = useState('');
  const [formNotes, setFormNotes] = useState('');

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
    setSelectedLead(lead);
    setFormFirstName(lead.firstName || '');
    setFormLastName(lead.lastName || '');
    setFormEmail(lead.email || '');
    setFormPhone(lead.phone || '');
    setFormStatus(lead.status || 'new');
    setFormSource(lead.source || 'website');
    setFormPriority(lead.priority || 'medium');
    setFormAssignedStaff(lead.assignedStaff || '');
    setFormNotes(lead.notes || '');
    setEditModalVisible(true);
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

  // Modal Submit Handlers
  const handleCreateSubmit = () => {
    if (!formFirstName.trim()) {
      toast.error(t('leads.form.firstNameRequired'), {
        title: t('leads.form.validationErrorTitle'),
      });
      return;
    }

    createMutation.mutate(
      {
        firstName: formFirstName.trim(),
        lastName: formLastName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim(),
        status: formStatus,
        source: formSource,
        priority: formPriority,
        assignedStaff: formAssignedStaff.trim() || undefined,
        notes: formNotes.trim() || undefined,
      },
      {
        onSuccess: () => {
          setCreateModalVisible(false);
          resetForm();
        },
        onError: err => {
          toast.error(err.message || t('leads.management.createError'), {
            title: t('common.error'),
          });
        },
      },
    );
  };

  const handleEditSubmit = () => {
    if (!selectedLead) return;
    if (!formFirstName.trim()) {
      toast.error(t('leads.form.firstNameRequired'), {
        title: t('leads.form.validationErrorTitle'),
      });
      return;
    }

    // Marking a lead converted only flips its status — like the web, offer to register the
    // member right away so the sale is recorded and credited to the lead's staff.
    const newlyConverted =
      formStatus === 'converted' && selectedLead.status !== 'converted' && !selectedLead.memberId;
    const convertedLead: Lead = {
      ...selectedLead,
      firstName: formFirstName.trim(),
      lastName: formLastName.trim(),
      email: formEmail.trim(),
      phone: formPhone.trim(),
      assignedStaff: formAssignedStaff.trim() || undefined,
    };

    updateMutation.mutate(
      {
        id: selectedLead.id,
        request: {
          firstName: formFirstName.trim(),
          lastName: formLastName.trim(),
          email: formEmail.trim(),
          phone: formPhone.trim(),
          status: formStatus,
          source: formSource,
          priority: formPriority,
          assignedStaff: formAssignedStaff.trim() || undefined,
          notes: formNotes.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          setEditModalVisible(false);
          setSelectedLead(null);
          resetForm();
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

  const handleBulkDelete = () => {
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
  };

  const resetForm = () => {
    setFormFirstName('');
    setFormLastName('');
    setFormEmail('');
    setFormPhone('');
    setFormStatus('new');
    setFormSource('website');
    setFormPriority('medium');
    setFormAssignedStaff('');
    setFormNotes('');
  };

  const openCreateModal = () => {
    if (selectedBranchId === 'ALL') {
      toast.error(t('leads.management.branchRequired'), {
        title: t('leads.management.branchRequiredTitle'),
      });
      return;
    }
    if (onNavigateToCreate) {
      onNavigateToCreate();
    } else {
      resetForm();
      setCreateModalVisible(true);
    }
  };

  // Header Component with KPI summary cards & filters
  const renderHeaderComponent = () => (
    <View style={styles.headerContainer}>
      {/* Top Title & Add Lead Button */}
      <View style={styles.titleRow}>
        <View>
          <Text style={[styles.screenTitle, { color: theme.text }]}>
            {t('leads.management.title')}
          </Text>
          <Text style={[styles.screenSubtitle, { color: theme.textSecondary }]}>
            {t('leads.management.subtitle')}
          </Text>
        </View>

        <Button
          label={t('leads.management.addLeadBtn')}
          size="md"
          onPress={openCreateModal}
        />
      </View>

      {/* KPI Stats Row */}
      {statsData && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsScroll}
        >
          <View style={[styles.kpiCard, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.kpiValue, { color: theme.text }]}>
              {statsData.totalLeads ?? 0}
            </Text>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>
              {t('leads.management.totalLeads')}
            </Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.kpiValue, { color: '#60a5fa' }]}>
              {statsData.newLeads ?? 0}
            </Text>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>
              {t('leads.management.newLeads')}
            </Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.kpiValue, { color: '#facc15' }]}>
              {statsData.contactedLeads ?? 0}
            </Text>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>
              {t('leads.management.contactedLeads')}
            </Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.kpiValue, { color: '#4ade80' }]}>
              {statsData.convertedLeads ?? 0}
            </Text>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>
              {t('leads.management.convertedLeads')}
            </Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.kpiValue, { color: BrandColors.teal }]}>
              {(statsData.conversionRate ?? 0).toFixed(1)}%
            </Text>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>
              {t('leads.management.conversionRate')}
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Search & Filter Bar */}
      <LeadFilters filters={filters} onChangeFilters={setFilters} />

      {/* Bulk Selection Toolbar */}
      <LeadSelectionToolbar
        selectedCount={selectedCount}
        onAssignStaff={() => setBulkAssignModalVisible(true)}
        onUpdateStatus={() => setBulkStatusModalVisible(true)}
        onDelete={handleBulkDelete}
        onClear={clearSelection}
      />
    </View>
  );

  return (
    <ScreenLayout>
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
        ListHeaderComponent={renderHeaderComponent()}
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

      {/* Create Lead Modal / Sheet */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setCreateModalVisible(false)}>
          <Pressable
            style={[styles.modalSheet, { backgroundColor: theme.background }]}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {t('leads.form.addNewLead')}
              </Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Feather name="x" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>
                {t('leads.form.firstName')}
              </Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={formFirstName}
                onChangeText={setFormFirstName}
                placeholder={t('leads.form.firstNamePlaceholder')}
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={[styles.fieldLabel, { color: theme.text }]}>
                {t('leads.form.lastName')}
              </Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={formLastName}
                onChangeText={setFormLastName}
                placeholder={t('leads.form.lastNamePlaceholder')}
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={[styles.fieldLabel, { color: theme.text }]}>
                {t('leads.form.emailLabel')}
              </Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={formEmail}
                onChangeText={setFormEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder={t('leads.form.emailPlaceholder')}
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={[styles.fieldLabel, { color: theme.text }]}>
                {t('leads.form.phoneLabel')}
              </Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={formPhone}
                onChangeText={setFormPhone}
                keyboardType="phone-pad"
                placeholder={t('leads.form.phonePlaceholder')}
                placeholderTextColor={theme.textSecondary}
              />

              <Dropdown
                label={t('leads.form.status')}
                value={formStatus}
                options={statusOptions}
                onChange={val => setFormStatus(val as LeadStatus)}
              />

              <Dropdown
                label={t('leads.form.priority')}
                value={formPriority}
                options={priorityOptions}
                onChange={val => setFormPriority(val as LeadPriority)}
              />

              <Dropdown
                label={t('leads.form.source')}
                value={formSource}
                options={sourceOptions}
                onChange={val => setFormSource(val as LeadSource)}
              />

              <Dropdown
                label={t('leads.form.assignedStaff')}
                placeholder={t('leads.management.selectStaffPlaceholder')}
                value={formAssignedStaff}
                options={staffOptions}
                onChange={setFormAssignedStaff}
              />

              <Text style={[styles.fieldLabel, { color: theme.text, marginTop: Spacing.two }]}>
                {t('leads.form.notes')}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.multilineInput,
                  { color: theme.text, borderColor: theme.border },
                ]}
                value={formNotes}
                onChangeText={setFormNotes}
                multiline
                numberOfLines={3}
                placeholder={t('leads.form.notesPlaceholder')}
                placeholderTextColor={theme.textSecondary}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.clearBtn, { borderColor: theme.border }]}
                onPress={() => setCreateModalVisible(false)}
              >
                <Text style={[styles.clearBtnText, { color: theme.textSecondary }]}>
                  {t('leads.form.cancel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.applyBtn} onPress={handleCreateSubmit}>
                <Text style={styles.applyBtnText}>{t('leads.form.createLead')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Edit Lead Modal / Sheet */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setEditModalVisible(false)}>
          <Pressable
            style={[styles.modalSheet, { backgroundColor: theme.background }]}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {t('leads.form.editLead')}
              </Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Feather name="x" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>
                {t('leads.form.firstName')}
              </Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={formFirstName}
                onChangeText={setFormFirstName}
              />

              <Text style={[styles.fieldLabel, { color: theme.text }]}>
                {t('leads.form.lastName')}
              </Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={formLastName}
                onChangeText={setFormLastName}
              />

              <Text style={[styles.fieldLabel, { color: theme.text }]}>
                {t('leads.form.emailLabel')}
              </Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={formEmail}
                onChangeText={setFormEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={[styles.fieldLabel, { color: theme.text }]}>
                {t('leads.form.phoneLabel')}
              </Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={formPhone}
                onChangeText={setFormPhone}
                keyboardType="phone-pad"
              />

              <Dropdown
                label={t('leads.form.status')}
                value={formStatus}
                options={statusOptions}
                onChange={val => setFormStatus(val as LeadStatus)}
              />

              <Dropdown
                label={t('leads.form.priority')}
                value={formPriority}
                options={priorityOptions}
                onChange={val => setFormPriority(val as LeadPriority)}
              />

              <Dropdown
                label={t('leads.form.source')}
                value={formSource}
                options={sourceOptions}
                onChange={val => setFormSource(val as LeadSource)}
              />

              <Dropdown
                label={t('leads.form.assignedStaff')}
                placeholder={t('leads.management.selectStaffPlaceholder')}
                value={formAssignedStaff}
                options={staffOptions}
                onChange={setFormAssignedStaff}
              />

              <Text style={[styles.fieldLabel, { color: theme.text, marginTop: Spacing.two }]}>
                {t('leads.form.notes')}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.multilineInput,
                  { color: theme.text, borderColor: theme.border },
                ]}
                value={formNotes}
                onChangeText={setFormNotes}
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.clearBtn, { borderColor: theme.border }]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={[styles.clearBtnText, { color: theme.textSecondary }]}>
                  {t('leads.form.cancel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.applyBtn} onPress={handleEditSubmit}>
                <Text style={styles.applyBtnText}>{t('leads.form.saveChanges')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  screenSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  statsScroll: {
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  kpiCard: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    minWidth: 100,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  kpiLabel: {
    fontSize: 11,
    marginTop: 2,
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
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: Spacing.two,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 14,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
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
