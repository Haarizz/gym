import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Input } from '@/shared/components/Input';
import type { PromotionFormData } from '../../hooks/usePromotionWizard';

interface StepProps {
  values: PromotionFormData;
  onChange: (field: keyof PromotionFormData, value: any) => void;
}

const AUDIENCE_OPTIONS = [
  { label: 'All Members', value: 'all' },
  { label: 'New Members', value: 'new-members' },
  { label: 'VIP / Premium', value: 'vip' },
  { label: 'Inactive / At-Risk', value: 'inactive' },
];

const CHANNEL_OPTIONS = [
  { label: 'In-App', value: 'app' },
  { label: 'Email', value: 'email' },
  { label: 'SMS', value: 'sms' },
  { label: 'Push Notification', value: 'push' },
];

export function TargetingStep({ values, onChange }: StepProps) {
  const toggleChannel = (channelValue: string) => {
    const current = values.channels || [];
    const next = current.includes(channelValue)
      ? current.filter((c: string) => c !== channelValue)
      : [...current, channelValue];
    onChange('channels', next);
  };

  return (
    <View style={styles.container}>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Target Audience</Text>
        <View style={styles.chipRow}>
          {AUDIENCE_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[
                styles.chip,
                values.targetAudience === opt.value && styles.activeChip,
              ]}
              onPress={() => onChange('targetAudience', opt.value)}
            >
              <Text
                style={[
                  styles.chipText,
                  values.targetAudience === opt.value && styles.activeChipText,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Distribution Channels</Text>
        <View style={styles.chipRow}>
          {CHANNEL_OPTIONS.map((opt) => {
            const isSelected = (values.channels || []).includes(opt.value);
            return (
              <Pressable
                key={opt.value}
                style={[
                  styles.chip,
                  isSelected && styles.activeChip,
                ]}
                onPress={() => toggleChannel(opt.value)}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.activeChipText,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Input
        label="Applicable Plans (Comma separated)"
        placeholder="e.g. Monthly VIP, Annual Basic"
        value={(values.applicablePlans || []).join(', ')}
        onChangeText={(val) =>
          onChange(
            'applicablePlans',
            val
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          )
        }
      />

      <Input
        label="Applicable Services (Comma separated)"
        placeholder="e.g. Personal Training, Spa"
        value={(values.applicableServices || []).join(', ')}
        onChangeText={(val) =>
          onChange(
            'applicableServices',
            val
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          )
        }
      />

      <Input
        label="Tags (Comma separated)"
        placeholder="e.g. summer, discount, hot"
        value={(values.tags || []).join(', ')}
        onChangeText={(val) =>
          onChange(
            'tags',
            val
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          )
        }
      />
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
});
