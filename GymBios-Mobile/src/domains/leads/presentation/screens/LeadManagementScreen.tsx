import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';

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

const STATUS_DROPDOWN_OPTIONS = [
  { label: 'New', value: 'new' },
  { label: 'Contacted', value: 'contacted' },
  { label: 'Follow-up', value: 'follow-up' },
  { label: 'Converted', value: 'converted' },
  { label: 'Lost', value: 'lost' },
];

const PRIORITY_DROPDOWN_OPTIONS = [
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
];

const SOURCE_DROPDOWN_OPTIONS = [
  { label: 'Website', value: 'website' },
  { label: 'Referral', value: 'referral' },
  { label: 'Walk-in', value: 'walk-in' },
  { label: 'Social Media', value: 'social-media' },
  { label: 'Phone', value: 'phone' },
  { label: 'Campaign', value: 'campaign' },
  { label: 'Other', value: 'other' },
];

export function LeadManagementScreen({
  onNavigateToDetail,
  onNavigateToCreate,
}: LeadManagementScreenProps) {
  const theme = useTheme();
  const { selectedBranchId } = useBranchContext();

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

  // Domain & Query Hooks
  const { staff } = useStaff();
  const staffOptions = useMemo(() => {
    const options = (staff || []).map(s => ({
      label: s.name ? `${s.name}${s.role ? ` (${s.role})` : ''}` : s.email,
      value: s.name || s.email,
    }));
    return [{ label: 'Unassigned', value: '' }, ...options];
  }, [staff]);

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
      toast.info('This lead does not have a phone number recorded.', {
        title: 'No Phone Number'
      });
      return;
    }
    Linking.openURL(`tel:${lead.phone.replace(/\s+/g, '')}`).catch(() => {
      toast.error('Unable to launch phone dialer on this device.', {
        title: 'Error'
      });
    });
  }, []);

  const handleEmail = useCallback((lead: Lead) => {
    if (!lead.email) {
      toast.info('This lead does not have an email address recorded.', {
        title: 'No Email Address'
      });
      return;
    }
    Linking.openURL(`mailto:${lead.email}`).catch(() => {
      toast.error('Unable to launch mail client on this device.', {
        title: 'Error'
      });
    });
  }, []);

  const handleMessage = useCallback((lead: Lead) => {
    if (!lead.phone) {
      toast.info('This lead does not have a phone number recorded.', {
        title: 'No Phone Number'
      });
      return;
    }
    Linking.openURL(`sms:${lead.phone.replace(/\s+/g, '')}`).catch(() => {
      toast.error('Unable to launch SMS messaging on this device.', {
        title: 'Error'
      });
    });
  }, []);

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
        'Delete Lead',
        `Are you sure you want to delete ${lead.firstName} ${lead.lastName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              deleteMutation.mutate(lead.id, {
                onSuccess: () => {
                  if (isSelected(lead.id)) toggleSelection(lead.id);
                },
                onError: err => {
                  toast.error(err.message || 'Failed to delete lead.', {
                    title: 'Error'
                  });
                },
              });
            },
          },
        ],
      );
    },
    [deleteMutation, isSelected, toggleSelection],
  );

  // Modal Submit Handlers
  const handleCreateSubmit = () => {
    if (!formFirstName.trim()) {
      toast.error('First name is required.', {
        title: 'Validation Error'
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
          toast.error(err.message || 'Failed to create lead.', {
            title: 'Error'
          });
        },
      },
    );
  };

  const handleEditSubmit = () => {
    if (!selectedLead) return;
    if (!formFirstName.trim()) {
      toast.error('First name is required.', {
        title: 'Validation Error'
      });
      return;
    }

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
        },
        onError: err => {
          toast.error(err.message || 'Failed to update lead.', {
            title: 'Error'
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
      toast.error(err.message || 'Failed to update lead statuses.', {
        title: 'Error'
      });
    }
  };

  const handleBulkAssignApply = async () => {
    if (!bulkStaffName.trim()) {
      toast.error('Staff member selection is required.', {
        title: 'Validation Error'
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
      toast.error(err.message || 'Failed to assign staff to leads.', {
        title: 'Error'
      });
    }
  };

  const handleBulkDelete = () => {
    Alert.alert(
      'Delete Selected Leads',
      `Are you sure you want to delete ${selectedCount} selected leads?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all(selectedLeadIds.map(id => deleteMutation.mutateAsync(id)));
              clearSelection();
            } catch (err: any) {
              toast.error(err.message || 'Failed to delete some leads.', {
                title: 'Error'
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
      toast.error('Please select a specific branch from the header menu before creating a new lead.', { title: 'Branch Required' });
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
          <Text style={[styles.screenTitle, { color: theme.text }]}>Lead Management</Text>
          <Text style={[styles.screenSubtitle, { color: theme.textSecondary }]}>
            Capture, track and convert prospect pipeline
          </Text>
        </View>

        <Button
          label="+ Lead"
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
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Total Leads</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.kpiValue, { color: '#60a5fa' }]}>
              {statsData.newLeads ?? 0}
            </Text>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>New</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.kpiValue, { color: '#facc15' }]}>
              {statsData.contactedLeads ?? 0}
            </Text>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Contacted</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.kpiValue, { color: '#4ade80' }]}>
              {statsData.convertedLeads ?? 0}
            </Text>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Converted</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.kpiValue, { color: BrandColors.teal }]}>
              {(statsData.conversionRate ?? 0).toFixed(1)}%
            </Text>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>
              Conversion Rate
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
              <Text style={[styles.modalTitle, { color: theme.text }]}>Add New Lead</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Feather name="x" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>First Name *</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={formFirstName}
                onChangeText={setFormFirstName}
                placeholder="First name"
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={[styles.fieldLabel, { color: theme.text }]}>Last Name</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={formLastName}
                onChangeText={setFormLastName}
                placeholder="Last name"
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={[styles.fieldLabel, { color: theme.text }]}>Email</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={formEmail}
                onChangeText={setFormEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="email@example.com"
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={[styles.fieldLabel, { color: theme.text }]}>Phone</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={formPhone}
                onChangeText={setFormPhone}
                keyboardType="phone-pad"
                placeholder="+1 (555) 000-0000"
                placeholderTextColor={theme.textSecondary}
              />

              <Dropdown
                label="Status"
                value={formStatus}
                options={STATUS_DROPDOWN_OPTIONS}
                onChange={val => setFormStatus(val as LeadStatus)}
              />

              <Dropdown
                label="Priority"
                value={formPriority}
                options={PRIORITY_DROPDOWN_OPTIONS}
                onChange={val => setFormPriority(val as LeadPriority)}
              />

              <Dropdown
                label="Source"
                value={formSource}
                options={SOURCE_DROPDOWN_OPTIONS}
                onChange={val => setFormSource(val as LeadSource)}
              />

              <Dropdown
                label="Assigned Staff"
                placeholder="Select staff member"
                value={formAssignedStaff}
                options={staffOptions}
                onChange={setFormAssignedStaff}
              />

              <Text style={[styles.fieldLabel, { color: theme.text, marginTop: Spacing.two }]}>
                Notes
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
                placeholder="Additional details..."
                placeholderTextColor={theme.textSecondary}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.clearBtn, { borderColor: theme.border }]}
                onPress={() => setCreateModalVisible(false)}
              >
                <Text style={[styles.clearBtnText, { color: theme.textSecondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.applyBtn} onPress={handleCreateSubmit}>
                <Text style={styles.applyBtnText}>Create Lead</Text>
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
              <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Lead</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Feather name="x" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>First Name *</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={formFirstName}
                onChangeText={setFormFirstName}
              />

              <Text style={[styles.fieldLabel, { color: theme.text }]}>Last Name</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={formLastName}
                onChangeText={setFormLastName}
              />

              <Text style={[styles.fieldLabel, { color: theme.text }]}>Email</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={formEmail}
                onChangeText={setFormEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={[styles.fieldLabel, { color: theme.text }]}>Phone</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={formPhone}
                onChangeText={setFormPhone}
                keyboardType="phone-pad"
              />

              <Dropdown
                label="Status"
                value={formStatus}
                options={STATUS_DROPDOWN_OPTIONS}
                onChange={val => setFormStatus(val as LeadStatus)}
              />

              <Dropdown
                label="Priority"
                value={formPriority}
                options={PRIORITY_DROPDOWN_OPTIONS}
                onChange={val => setFormPriority(val as LeadPriority)}
              />

              <Dropdown
                label="Source"
                value={formSource}
                options={SOURCE_DROPDOWN_OPTIONS}
                onChange={val => setFormSource(val as LeadSource)}
              />

              <Dropdown
                label="Assigned Staff"
                placeholder="Select staff member"
                value={formAssignedStaff}
                options={staffOptions}
                onChange={setFormAssignedStaff}
              />

              <Text style={[styles.fieldLabel, { color: theme.text, marginTop: Spacing.two }]}>
                Notes
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
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.applyBtn} onPress={handleEditSubmit}>
                <Text style={styles.applyBtnText}>Save Changes</Text>
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
                Update Status ({selectedCount} leads)
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
                    Set as &quot;{statusOption}&quot;
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
                Assign Staff ({selectedCount} leads)
              </Text>
              <TouchableOpacity onPress={() => setBulkAssignModalVisible(false)}>
                <Feather name="x" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Dropdown
                label="Assign Staff Member"
                placeholder="Select staff member"
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
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.applyBtn} onPress={handleBulkAssignApply}>
                <Text style={styles.applyBtnText}>Assign</Text>
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
