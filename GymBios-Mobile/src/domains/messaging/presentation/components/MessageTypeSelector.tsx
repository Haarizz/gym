import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { MessagingColors } from '../theme';

interface MessageTypeSelectorProps {
  selectedType: string;
  onSelectType: (type: string) => void;
}

export function MessageTypeSelector({ selectedType, onSelectType }: MessageTypeSelectorProps) {
  const types = [
    { id: 'email', label: 'Email', icon: 'mail', color: MessagingColors.dark, tint: MessagingColors.tint, border: MessagingColors.accent },
    { id: 'sms', label: 'SMS', icon: 'message-circle', color: MessagingColors.sms, tint: MessagingColors.smsTint, border: MessagingColors.sms },
    { id: 'push', label: 'Push', icon: 'bell', color: MessagingColors.push, tint: MessagingColors.pushTint, border: MessagingColors.push },
  ] as const;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {types.map((type) => {
          const isSelected = selectedType === type.id;
          return (
            <Pressable
              key={type.id}
              style={[
                styles.typeButton, 
                isSelected && { backgroundColor: type.tint, borderColor: type.border }
              ]}
              onPress={() => onSelectType(type.id)}
            >
              <Feather
                name={type.icon}
                size={16}
                color={isSelected ? type.color : MessagingColors.muted}
              />
              <Text
                style={[
                  styles.typeLabel, 
                  isSelected && { color: type.color }
                ]}
              >
                {type.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 11,
    paddingHorizontal: 4,
    backgroundColor: MessagingColors.card,
    borderWidth: 1.5,
    borderColor: MessagingColors.line,
    borderRadius: 13,
  },
  typeLabel: {
    fontSize: 11.5,
    color: MessagingColors.muted,
    fontWeight: '700',
  },
});
