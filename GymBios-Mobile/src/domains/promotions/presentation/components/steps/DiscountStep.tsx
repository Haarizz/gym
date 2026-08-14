import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Input } from '@/shared/components/Input';
import type { PromotionFormData } from '../../hooks/usePromotionWizard';

interface StepProps {
  values: PromotionFormData;
  onChange: (field: keyof PromotionFormData, value: any) => void;
}

const DISCOUNT_TYPE_OPTIONS = [
  { label: 'Percentage (%)', value: 'percentage' },
  { label: 'Fixed Amount ($)', value: 'fixed' },
];

export function DiscountStep({ values, onChange }: StepProps) {
  return (
    <View style={styles.container}>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Discount Type</Text>
        <View style={styles.chipRow}>
          {DISCOUNT_TYPE_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[
                styles.chip,
                values.discountType === opt.value && styles.activeChip,
              ]}
              onPress={() => onChange('discountType', opt.value)}
            >
              <Text
                style={[
                  styles.chipText,
                  values.discountType === opt.value && styles.activeChipText,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Input
        label="Discount Value *"
        placeholder="e.g. 20"
        keyboardType="numeric"
        value={values.discountValue}
        onChangeText={(val) => onChange('discountValue', val)}
      />

      <View style={styles.gridRow}>
        <View style={styles.gridCol}>
          <Input
            label="Min Purchase ($)"
            placeholder="0"
            keyboardType="numeric"
            value={values.minimumPurchase}
            onChangeText={(val) => onChange('minimumPurchase', val)}
          />
        </View>
        <View style={styles.gridCol}>
          <Input
            label="Max Discount ($)"
            placeholder="No limit"
            keyboardType="numeric"
            value={values.maximumDiscount}
            onChangeText={(val) => onChange('maximumDiscount', val)}
          />
        </View>
      </View>

      <Input
        label="Voucher / Promo Code"
        placeholder="e.g. SUMMER2026"
        autoCapitalize="characters"
        value={values.code}
        onChangeText={(val) => onChange('code', val)}
      />

      <View style={styles.gridRow}>
        <View style={styles.gridCol}>
          <Input
            label="Total Usage Limit"
            placeholder="Unlimited"
            keyboardType="numeric"
            value={values.usageLimit}
            onChangeText={(val) => onChange('usageLimit', val)}
          />
        </View>
        <View style={styles.gridCol}>
          <Input
            label="Limit Per Member"
            placeholder="Unlimited"
            keyboardType="numeric"
            value={values.usageLimitPerMember}
            onChangeText={(val) => onChange('usageLimitPerMember', val)}
          />
        </View>
      </View>

      {/* Auto Apply & Stackable Toggles */}
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Auto Apply at Checkout</Text>
        <Pressable
          style={[
            styles.toggleSwitch,
            values.autoApply && styles.toggleSwitchActive,
          ]}
          onPress={() => onChange('autoApply', !values.autoApply)}
        >
          <View
            style={[
              styles.toggleThumb,
              values.autoApply && styles.toggleThumbActive,
            ]}
          />
        </Pressable>
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Stackable with Other Offers</Text>
        <Pressable
          style={[
            styles.toggleSwitch,
            values.stackable && styles.toggleSwitchActive,
          ]}
          onPress={() => onChange('stackable', !values.stackable)}
        >
          <View
            style={[
              styles.toggleThumb,
              values.stackable && styles.toggleThumbActive,
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
    gap: Spacing.two,
  },
  chip: {
    flex: 1,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    borderRadius: Radius.md,
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
  gridRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  gridCol: {
    flex: 1,
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
