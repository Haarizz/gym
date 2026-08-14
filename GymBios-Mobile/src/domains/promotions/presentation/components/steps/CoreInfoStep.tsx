import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Input } from '@/shared/components/Input';
import type { PromotionFormData } from '../../hooks/usePromotionWizard';

interface StepProps {
  values: PromotionFormData;
  onChange: (field: keyof PromotionFormData, value: any) => void;
}

const TYPE_OPTIONS = [
  { label: 'Discount', value: 'discount' },
  { label: 'Voucher', value: 'voucher' },
  { label: 'Combo', value: 'combo' },
  { label: 'BOGO', value: 'bogo' },
  { label: 'Seasonal', value: 'seasonal' },
  { label: 'Loyalty', value: 'loyalty' },
  { label: 'Access Days', value: 'promotional-access-days' },
];

const STATUS_OPTIONS = [
  { label: 'Draft', value: 'draft' },
  { label: 'Active', value: 'active' },
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Paused', value: 'paused' },
];

export function CoreInfoStep({ values, onChange }: StepProps) {
  return (
    <View style={styles.container}>
      <Input
        label="Promotion Name *"
        placeholder="e.g. Summer Fitness Surge"
        value={values.name}
        onChangeText={(val) => onChange('name', val)}
      />

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Promotion Type *</Text>
        <View style={styles.chipRow}>
          {TYPE_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[
                styles.chip,
                values.type === opt.value && styles.activeChip,
              ]}
              onPress={() => onChange('type', opt.value)}
            >
              <Text
                style={[
                  styles.chipText,
                  values.type === opt.value && styles.activeChipText,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Status</Text>
        <View style={styles.chipRow}>
          {STATUS_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[
                styles.chip,
                values.status === opt.value && styles.activeChip,
              ]}
              onPress={() => onChange('status', opt.value)}
            >
              <Text
                style={[
                  styles.chipText,
                  values.status === opt.value && styles.activeChipText,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Input
        label="Description"
        placeholder="Brief description of the promotion..."
        value={values.description}
        onChangeText={(val) => onChange('description', val)}
        multiline
        numberOfLines={3}
      />

      <Input
        label="Category"
        placeholder="e.g. Membership, Services"
        value={values.category}
        onChangeText={(val) => onChange('category', val)}
      />

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Public Promotion</Text>
        <Pressable
          style={[
            styles.toggleSwitch,
            values.isPublic && styles.toggleSwitchActive,
          ]}
          onPress={() => onChange('isPublic', !values.isPublic)}
        >
          <View
            style={[
              styles.toggleThumb,
              values.isPublic && styles.toggleThumbActive,
            ]}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  fieldGroup: {
    gap: Spacing.one,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeChip: {
    backgroundColor: BrandColors.teal,
    borderColor: BrandColors.teal,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
  activeChipText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#CBD5E1',
    padding: 2,
  },
  toggleSwitchActive: {
    backgroundColor: BrandColors.teal,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
});
