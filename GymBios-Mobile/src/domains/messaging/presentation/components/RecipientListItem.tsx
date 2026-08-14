import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Avatar } from '@/shared/components/Avatar';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { MessagingRecipient } from '../../domain/MessagingModels';
import { getRecipientKey } from '../../domain/utils';

interface RecipientListItemProps {
  recipient: MessagingRecipient;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

export function RecipientListItem({ recipient, isSelected, onToggle }: RecipientListItemProps) {
  return (
    <Pressable
      style={[styles.container, isSelected && styles.containerSelected]}
      onPress={() => onToggle(getRecipientKey(recipient))}
    >
      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
        {isSelected && <Feather name="check" size={14} color="#fff" />}
      </View>
      
      <Avatar imageUrl={recipient.avatar} name={recipient.name} size={40} />
      
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{recipient.name}</Text>
        <Text style={styles.details}>
          {recipient.type} {recipient.membershipStatus ? `• ${recipient.membershipStatus}` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    backgroundColor: BrandColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  containerSelected: {
    backgroundColor: 'rgba(50, 127, 116, 0.05)',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: Radius.sm,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    marginRight: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: BrandColors.teal,
    borderColor: BrandColors.teal,
  },
  infoContainer: {
    marginLeft: Spacing.three,
    flex: 1,
  },
  name: {
    fontSize: TypographyScale.body,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  details: {
    fontSize: TypographyScale.small,
    color: BrandColors.textSecondary,
    marginTop: 2,
  },
});
