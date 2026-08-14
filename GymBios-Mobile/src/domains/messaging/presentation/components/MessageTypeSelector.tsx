import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';

interface MessageTypeSelectorProps {
  selectedType: string;
  onSelectType: (type: string) => void;
}

export function MessageTypeSelector({ selectedType, onSelectType }: MessageTypeSelectorProps) {
  const types = [
    { id: 'email', label: 'Email', icon: 'mail' },
    { id: 'sms', label: 'SMS', icon: 'message-circle' },
    { id: 'push', label: 'Push', icon: 'bell' },
  ] as const;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Message Type</Text>
      <View style={styles.row}>
        {types.map((type) => (
          <Pressable
            key={type.id}
            style={[styles.typeButton, selectedType === type.id && styles.typeButtonSelected]}
            onPress={() => onSelectType(type.id)}
          >
            <Feather
              name={type.icon}
              size={18}
              color={selectedType === type.id ? BrandColors.teal : BrandColors.textSecondary}
            />
            <Text
              style={[styles.typeLabel, selectedType === type.id && styles.typeLabelSelected]}
            >
              {type.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.four,
  },
  label: {
    fontSize: TypographyScale.body,
    fontWeight: '600',
    color: BrandColors.textPrimary,
    marginBottom: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    backgroundColor: BrandColors.surface,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: Radius.md,
  },
  typeButtonSelected: {
    borderColor: BrandColors.teal,
    backgroundColor: 'rgba(50, 127, 116, 0.05)',
  },
  typeLabel: {
    fontSize: TypographyScale.body,
    color: BrandColors.textSecondary,
    fontWeight: '500',
  },
  typeLabelSelected: {
    color: BrandColors.teal,
  },
});
