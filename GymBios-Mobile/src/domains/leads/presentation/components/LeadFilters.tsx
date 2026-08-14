import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { SearchBar } from '@/shared/components/SearchBar';
import type { LeadFilters as LeadFiltersType } from '../../domain/LeadFilters';

interface LeadFiltersProps {
  filters: LeadFiltersType;
  onChangeFilters: (filters: LeadFiltersType) => void;
}

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'New', value: 'new' },
  { label: 'Contacted', value: 'contacted' },
  { label: 'Follow-up', value: 'follow-up' },
  { label: 'Converted', value: 'converted' },
  { label: 'Lost', value: 'lost' },
];

const PRIORITY_OPTIONS = [
  { label: 'All Priorities', value: '' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
];

const SOURCE_OPTIONS = [
  { label: 'All Sources', value: '' },
  { label: 'Website', value: 'website' },
  { label: 'Referral', value: 'referral' },
  { label: 'Walk-in', value: 'walk-in' },
  { label: 'Social Media', value: 'social-media' },
  { label: 'Phone', value: 'phone' },
  { label: 'Campaign', value: 'campaign' },
];

export function LeadFilters({ filters, onChangeFilters }: LeadFiltersProps) {
  const theme = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const activeFilterCount =
    (filters.status ? 1 : 0) +
    (filters.priority ? 1 : 0) +
    (filters.source ? 1 : 0);

  const handleSearchChange = (text: string) => {
    onChangeFilters({ ...filters, search: text || undefined, page: 1 });
  };

  const handleSelectStatus = (val: string) => {
    onChangeFilters({ ...filters, status: val || undefined, page: 1 });
  };

  const handleSelectPriority = (val: string) => {
    onChangeFilters({ ...filters, priority: val || undefined, page: 1 });
  };

  const handleSelectSource = (val: string) => {
    onChangeFilters({ ...filters, source: val || undefined, page: 1 });
  };

  const handleClearAll = () => {
    onChangeFilters({ page: 1, size: filters.size });
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <SearchBar
            value={filters.search ?? ''}
            onChangeText={handleSearchChange}
            placeholder="Search leads by name, email, phone..."
          />
        </View>

        <TouchableOpacity
          style={[
            styles.filterButton,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            activeFilterCount > 0 && { borderColor: BrandColors.teal },
          ]}
          onPress={() => setModalVisible(true)}
          accessibilityLabel="Open Filters"
        >
          <Feather
            name="filter"
            size={18}
            color={activeFilterCount > 0 ? BrandColors.teal : theme.text}
          />
          {activeFilterCount > 0 && (
            <View style={styles.badgeCount}>
              <Text style={styles.badgeCountText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Filter Chips ScrollView */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsScroll}
      >
        {/* Status Chips */}
        {STATUS_OPTIONS.map(opt => {
          const isActive = (filters.status ?? '') === opt.value;
          return (
            <Pressable
              key={`status-${opt.value}`}
              style={[
                styles.chip,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                isActive && styles.activeChip,
              ]}
              onPress={() => handleSelectStatus(opt.value)}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: theme.textSecondary },
                  isActive && styles.activeChipText,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable
            style={[styles.modalSheet, { backgroundColor: theme.background }]}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Filter Leads</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Status Section */}
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Status</Text>
              <View style={styles.optionsWrap}>
                {STATUS_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.modalOption,
                      { backgroundColor: theme.backgroundElement },
                      (filters.status ?? '') === opt.value && styles.activeModalOption,
                    ]}
                    onPress={() => handleSelectStatus(opt.value)}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        { color: theme.text },
                        (filters.status ?? '') === opt.value && styles.activeModalOptionText,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Priority Section */}
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Priority</Text>
              <View style={styles.optionsWrap}>
                {PRIORITY_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.modalOption,
                      { backgroundColor: theme.backgroundElement },
                      (filters.priority ?? '') === opt.value && styles.activeModalOption,
                    ]}
                    onPress={() => handleSelectPriority(opt.value)}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        { color: theme.text },
                        (filters.priority ?? '') === opt.value && styles.activeModalOptionText,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Source Section */}
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Source</Text>
              <View style={styles.optionsWrap}>
                {SOURCE_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.modalOption,
                      { backgroundColor: theme.backgroundElement },
                      (filters.source ?? '') === opt.value && styles.activeModalOption,
                    ]}
                    onPress={() => handleSelectSource(opt.value)}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        { color: theme.text },
                        (filters.source ?? '') === opt.value && styles.activeModalOptionText,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.clearBtn, { borderColor: theme.border }]}
                onPress={handleClearAll}
              >
                <Text style={[styles.clearBtnText, { color: theme.textSecondary }]}>
                  Reset All
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.applyBtnText}>Done</Text>
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
    marginBottom: Spacing.three,
    gap: Spacing.two,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  searchWrap: {
    flex: 1,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: BrandColors.teal,
    borderRadius: 9,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  chipsScroll: {
    gap: Spacing.two,
    paddingVertical: Spacing.half,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  activeChip: {
    backgroundColor: BrandColors.teal,
    borderColor: BrandColors.teal,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeChipText: {
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '80%',
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: Spacing.two,
    marginBottom: Spacing.two,
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  modalOption: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
  },
  activeModalOption: {
    backgroundColor: BrandColors.teal,
  },
  modalOptionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  activeModalOptionText: {
    color: '#ffffff',
    fontWeight: '700',
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
});
