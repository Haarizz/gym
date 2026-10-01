import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet';
import { Typography } from '@/shared/components/Typography';

export interface MemberListFilters {
  status: string;
  membershipType: string;
  paymentStatus: string;
}

export const EMPTY_MEMBER_FILTERS: MemberListFilters = {
  status: '',
  membershipType: '',
  paymentStatus: '',
};

interface Option {
  label: string;
  value: string;
}

// Values are the lowercase strings the backend stores and filters on.
export const MEMBER_STATUS_OPTIONS: Option[] = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Expired', value: 'expired' },
  { label: 'Frozen', value: 'frozen' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Suspended', value: 'suspended' },
];

const MEMBERSHIP_TYPE_OPTIONS: Option[] = [
  { label: 'All', value: '' },
  { label: 'Individual', value: 'individual' },
  { label: 'Family', value: 'family' },
  { label: 'Couple', value: 'couple' },
  { label: 'Corporate', value: 'corporate' },
];

const PAYMENT_STATUS_OPTIONS: Option[] = [
  { label: 'All', value: '' },
  { label: 'Paid', value: 'paid' },
  { label: 'Partial', value: 'partial' },
  { label: 'Pending', value: 'pending' },
  { label: 'Overdue', value: 'overdue' },
];

interface FilterChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

export function FilterChip({ label, active, onPress }: FilterChipProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[
        styles.chip,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        active && styles.chipActive,
      ]}
    >
      <Typography
        variant="caption"
        style={[styles.chipLabel, { color: active ? BrandColors.white : theme.textSecondary }]}
      >
        {label}
      </Typography>
    </Pressable>
  );
}

interface MemberFilterSheetProps {
  visible: boolean;
  filters: MemberListFilters;
  onApply: (filters: MemberListFilters) => void;
  onClose: () => void;
}

export function MemberFilterSheet({ visible, filters, onApply, onClose }: MemberFilterSheetProps) {
  const theme = useTheme();
  // Edit a draft so the list only refetches once, on Apply.
  const [draft, setDraft] = useState(filters);
  const [wasVisible, setWasVisible] = useState(visible);

  // Re-seed the draft from the applied filters each time the sheet opens.
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setDraft(filters);
  }

  const groups: { title: string; key: keyof MemberListFilters; options: Option[] }[] = [
    { title: 'Membership status', key: 'status', options: MEMBER_STATUS_OPTIONS },
    { title: 'Membership type', key: 'membershipType', options: MEMBERSHIP_TYPE_OPTIONS },
    { title: 'Payment status', key: 'paymentStatus', options: PAYMENT_STATUS_OPTIONS },
  ];

  return (
    <AppBottomSheet visible={visible} title="Filter members" onClose={onClose}>
      {groups.map((group) => (
        <View key={group.key} style={styles.group}>
          <Typography variant="bodySmallBold">{group.title}</Typography>
          <View style={styles.optionsWrap}>
            {group.options.map((opt) => (
              <FilterChip
                key={opt.value || 'all'}
                label={opt.label}
                active={draft[group.key] === opt.value}
                onPress={() => setDraft((prev) => ({ ...prev, [group.key]: opt.value }))}
              />
            ))}
          </View>
        </View>
      ))}

      <View style={styles.footer}>
        <Pressable
          style={[styles.footerButton, styles.resetButton, { borderColor: theme.border }]}
          onPress={() => setDraft(EMPTY_MEMBER_FILTERS)}
          accessibilityRole="button"
        >
          <Typography variant="bodySmallBold" color="textSecondary">
            Reset
          </Typography>
        </Pressable>
        <Pressable
          style={[styles.footerButton, styles.applyButton]}
          onPress={() => onApply(draft)}
          accessibilityRole="button"
        >
          <Typography variant="bodySmallBold" style={{ color: BrandColors.white }}>
            Apply filters
          </Typography>
        </Pressable>
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: BrandColors.teal,
    borderColor: BrandColors.teal,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  footerButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  resetButton: {
    borderWidth: 1,
  },
  applyButton: {
    backgroundColor: BrandColors.teal,
  },
});
