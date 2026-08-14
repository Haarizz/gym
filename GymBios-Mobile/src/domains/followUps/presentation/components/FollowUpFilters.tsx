import React, { useCallback, useMemo, useState } from 'react';
import {
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
import { Dropdown } from '@/shared/components/Dropdown';
import type { FollowUpFilters as FollowUpFiltersType } from '../../domain/FollowUpFilters';

interface FollowUpFiltersProps {
  filters: FollowUpFiltersType;
  onChangeFilters: (filters: FollowUpFiltersType) => void;
}

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Rescheduled', value: 'rescheduled' },
];

const TYPE_OPTIONS = [
  { label: 'All Types', value: '' },
  { label: 'Call', value: 'call' },
  { label: 'Email', value: 'email' },
  { label: 'SMS', value: 'sms' },
  { label: 'WhatsApp', value: 'whatsapp' },
  { label: 'In-App', value: 'in-app' },
  { label: 'Meeting', value: 'meeting' },
  { label: 'Visit', value: 'visit' },
];

const PRIORITY_OPTIONS = [
  { label: 'All Priorities', value: '' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
];

export function FollowUpFilters({
  filters,
  onChangeFilters,
}: FollowUpFiltersProps) {
  const theme = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  // Local state for modal before applying
  const [localStatus, setLocalStatus] = useState(filters.status || '');
  const [localType, setLocalType] = useState(filters.type || '');
  const [localPriority, setLocalPriority] = useState(filters.priority || '');
  const [localStaff, setLocalStaff] = useState(filters.assignedStaff || '');

  const { staff } = useStaff();
  const staffOptions = useMemo(() => {
    const options = (staff || []).map(s => ({
      label: s.name ? `${s.name}${s.role ? ` (${s.role})` : ''}` : s.email,
      value: s.name || s.email,
    }));
    return [{ label: 'All Staff', value: '' }, ...options];
  }, [staff]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status) count++;
    if (filters.type) count++;
    if (filters.priority) count++;
    if (filters.assignedStaff) count++;
    return count;
  }, [filters]);

  const handleOpenModal = useCallback(() => {
    setLocalStatus(filters.status || '');
    setLocalType(filters.type || '');
    setLocalPriority(filters.priority || '');
    setLocalStaff(filters.assignedStaff || '');
    setModalVisible(true);
  }, [filters]);

  const handleApply = useCallback(() => {
    onChangeFilters({
      ...filters,
      status: localStatus || undefined,
      type: localType || undefined,
      priority: localPriority || undefined,
      assignedStaff: localStaff || undefined,
      page: 1,
    });
    setModalVisible(false);
  }, [filters, localStatus, localType, localPriority, localStaff, onChangeFilters]);

  const handleReset = useCallback(() => {
    setLocalStatus('');
    setLocalType('');
    setLocalPriority('');
    setLocalStaff('');
    onChangeFilters({
      ...filters,
      status: undefined,
      type: undefined,
      priority: undefined,
      assignedStaff: undefined,
      page: 1,
    });
    setModalVisible(false);
  }, [filters, onChangeFilters]);

  const handleSearchChange = (text: string) => {
    onChangeFilters({
      ...filters,
      search: text || undefined,
      page: 1,
    });
  };

  return (
    <View style={styles.container}>
      {/* Search Input & Filter Button */}
      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchInputContainer,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}
        >
          <Feather name="search" size={18} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search member, email, subject..."
            placeholderTextColor={theme.textSecondary}
            value={filters.search || ''}
            onChangeText={handleSearchChange}
          />
          {filters.search ? (
            <TouchableOpacity onPress={() => handleSearchChange('')}>
              <Feather name="x-circle" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={[
            styles.filterBtn,
            {
              backgroundColor: activeFilterCount > 0 ? BrandColors.teal : theme.backgroundElement,
              borderColor: activeFilterCount > 0 ? BrandColors.teal : theme.border,
            },
          ]}
          onPress={handleOpenModal}
        >
          <Feather
            name="sliders"
            size={18}
            color={activeFilterCount > 0 ? '#ffffff' : theme.text}
          />
          {activeFilterCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeFilterCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {/* Filter BottomSheet Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable
            style={[styles.modalContent, { backgroundColor: theme.background }]}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Filter Follow-ups</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Dropdown
                label="Status"
                value={localStatus}
                options={STATUS_OPTIONS}
                onChange={setLocalStatus}
              />

              <Dropdown
                label="Type"
                value={localType}
                options={TYPE_OPTIONS}
                onChange={setLocalType}
              />

              <Dropdown
                label="Priority"
                value={localPriority}
                options={PRIORITY_OPTIONS}
                onChange={setLocalPriority}
              />

              <Dropdown
                label="Assigned Staff"
                value={localStaff}
                options={staffOptions}
                onChange={setLocalStaff}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.clearBtn, { borderColor: theme.border }]}
                onPress={handleReset}
              >
                <Text style={[styles.clearBtnText, { color: theme.textSecondary }]}>
                  Reset All
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.applyBtn, { backgroundColor: BrandColors.teal }]}
                onPress={handleApply}
              >
                <Text style={styles.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.two,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#dc2626',
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '80%',
    paddingBottom: Spacing.four,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.four,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    padding: Spacing.four,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  clearBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    fontWeight: '600',
    fontSize: 14,
  },
  applyBtn: {
    flex: 2,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
});
