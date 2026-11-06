import React, { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text, TextInput } from '@/shared/components/AppText';
import { useTranslation } from 'react-i18next';
import Feather from '@expo/vector-icons/Feather';

import { useTheme } from '@/core/hooks';
import { Button } from '@/shared/components/Button';
import { FormSheet } from '@/shared/components/FormSheet';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { useStaff } from '@/domains/hr/presentation/hooks/useStaff';
import { Dropdown } from '@/shared/components/Dropdown';
import type { FollowUpFilters as FollowUpFiltersType } from '../../domain/FollowUpFilters';
import { localizeOptions, translateValue, tOr } from '@/core/i18n/format';

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
  const { t } = useTranslation();
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
      label: s.name ? `${s.name}${s.role ? ` (${translateValue('role', s.role)})` : ''}` : s.email,
      value: s.name || s.email,
    }));
    return [{ label: t('followUps.filters.allStaff'), value: '' }, ...options];
  }, [staff, t]);

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
            placeholder={t('followUps.searchPlaceholder')}
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

      {/* Filter sheet */}
      <FormSheet
        visible={modalVisible}
        title={t('followUps.filterTitle')}
        icon="sliders"
        closeLabel={t('followUps.cancel')}
        onClose={() => setModalVisible(false)}
        footer={
          <>
            <Button variant="outline" label={t('followUps.resetAll')} onPress={handleReset} style={styles.flex} />
            <Button label={t('followUps.applyFilters')} onPress={handleApply} style={styles.flex} />
          </>
        }
      >
          <Dropdown
            label={t('followUps.status')}
            value={localStatus}
            options={localizeOptions(STATUS_OPTIONS, 'status').map(o => (o.value ? o : { ...o, label: t('followUps.filters.allStatuses') }))}
            onChange={setLocalStatus}
          />

          <Dropdown
            label={t('followUps.type')}
            value={localType}
            options={localizeOptions(TYPE_OPTIONS, 'channel').map(o => (o.value ? o : { ...o, label: t('followUps.filters.allTypes') }))}
            onChange={setLocalType}
          />

          <Dropdown
            label={t('followUps.priority')}
            value={localPriority}
            options={localizeOptions(PRIORITY_OPTIONS, 'priority').map(o => (o.value ? o : { ...o, label: t('followUps.filters.allPriorities') }))}
            onChange={setLocalPriority}
          />

          <Dropdown
            label={t('followUps.assignedStaff')}
            value={localStaff}
            options={staffOptions}
            onChange={setLocalStaff}
          />
      </FormSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {},
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
});
