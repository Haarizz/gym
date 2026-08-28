import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Avatar } from '@/shared/components/Avatar';
import { TypographyScale } from '@/core/theme';
import { MessagingRecipient } from '../../domain/MessagingModels';
import { getRecipientKey } from '../../domain/utils';
import { MessagingColors } from '../theme';

const AV = ['#2F8A73', '#4FA3D1', '#8E7CC3', '#D9822B', '#C93B5C', '#5CB69F', '#7C6CE0', '#3B9BC9'];

interface RecipientListItemProps {
  recipient: MessagingRecipient;
  isSelected: boolean;
  onToggle: (id: string) => void;
  index: number;
}

export function RecipientListItem({ recipient, isSelected, onToggle, index }: RecipientListItemProps) {
  const avatarColor = AV[index % AV.length];
  // Determine if branch is downtown or uptown for mock purposes if it's stored in tags or location
  const branch = recipient.location || 'Downtown';
  const isExpiring = recipient.membershipStatus?.toLowerCase() === 'expiring' || recipient.membershipStatus?.toLowerCase() === 'expiring soon';

  return (
    <Pressable
      style={styles.container}
      onPress={() => onToggle(getRecipientKey(recipient))}
    >
      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
        {isSelected && <Feather name="check" size={12} color="#fff" strokeWidth={3} />}
      </View>
      
      <Avatar 
        name={recipient.name} 
        size={38} 
        backgroundColor={avatarColor}
        style={styles.avatar}
      />
      
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{recipient.name}</Text>
        <View style={styles.tagsRow}>
          <Text style={[styles.tag, styles.branchTag]}>{branch}</Text>
          <Text style={[
            styles.tag, 
            isExpiring ? styles.expiringTag : styles.activeTag
          ]}>
            {isExpiring ? 'Expiring soon' : 'Active'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: MessagingColors.line,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.8,
    borderColor: '#D3D2DC',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: MessagingColors.accent,
    borderColor: MessagingColors.accent,
  },
  avatar: {
    borderRadius: 12, // Override fully rounded
  },
  infoContainer: {
    marginLeft: 12,
    flex: 1,
  },
  name: {
    fontSize: 13.5,
    fontWeight: '700',
    color: MessagingColors.ink,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  tag: {
    fontSize: 10.5,
    fontWeight: '700',
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 9,
    overflow: 'hidden',
  },
  branchTag: {
    backgroundColor: '#EFEEF6',
    color: '#8A8D99',
  },
  activeTag: {
    backgroundColor: MessagingColors.tint,
    color: MessagingColors.dark,
  },
  expiringTag: {
    backgroundColor: '#FCEFDD',
    color: '#B4711F',
  },
});
