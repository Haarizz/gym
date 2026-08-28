import React from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Avatar } from '@/shared/components/Avatar';
import { Radius, Spacing } from '@/core/theme';

export interface StaffCheckInCardProps {
  person: any; // Can be a member or staff
  onCheckIn: (person: any) => void;
  onCheckOut: (person: any) => void;
  isActive?: boolean;
}

export function StaffCheckInCard({ person, onCheckIn, onCheckOut, isActive }: StaffCheckInCardProps) {
  const name = person.name || 'Unknown';
  // Fallbacks across Member and Staff domains
  const id = person.bizId || person.memberNumber || person.id;
  const role = person.membershipType || person.role || person.department || 'User';
  const avatarUrl = person.photoUrl;
  
  const initials = name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
  const hasMembership = !!person.membershipPlanId || !!person.membershipPlanName || person.status === 'active' || isActive;

  return (
    <View style={[styles.card, isActive && styles.cardActive, !isActive && !hasMembership && styles.cardDisabled]}>
      <View style={styles.leftContent}>
        <View style={styles.avatarContainer}>
          <Avatar imageUrl={avatarUrl} initials={initials} size={38} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <View style={styles.metaContainer}>
            <Text style={styles.meta} numberOfLines={1}>
              {id} 
            </Text>
            <View style={[styles.tag, !hasMembership && styles.tagDisabled]}>
              <Text style={styles.tagText}>{role}</Text>
            </View>
          </View>
        </View>
      </View>
      
      <View style={styles.actions}>
        {isActive ? (
          <>
            <View style={[styles.statusPill, styles.statusIn]}>
              <Feather name="check" size={10} color="#2f9e6e" style={{ marginRight: 3 }} />
              <Text style={[styles.statusText, styles.statusTextIn]}>In Gym</Text>
            </View>
            <Pressable 
              style={[styles.actionBtn, styles.actionOut]} 
              onPress={() => onCheckOut(person)}
            >
              <Feather name="log-out" size={12} color="#e0574f" />
              <Text style={[styles.actionText, styles.actionTextOut]}>Check Out</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={[styles.statusPill, styles.statusOut]}>
              <Text style={[styles.statusText, styles.statusTextOut]}>Not in</Text>
            </View>
            <Pressable 
              style={[styles.actionBtn, styles.actionIn, !hasMembership && styles.actionInDisabled]} 
              onPress={() => hasMembership && onCheckIn(person)}
            >
              <Feather name="log-in" size={12} color={hasMembership ? "#ffffff" : "#a3b8b2"} />
              <Text style={[styles.actionText, styles.actionTextIn, !hasMembership && styles.actionTextInDisabled]}>
                {hasMembership ? 'Check In' : 'No Plan'}
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e3ece9',
    shadowColor: '#0f4a3d',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardActive: {
    borderColor: '#2f9e6e',
    borderWidth: 1.5,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  avatarContainer: {
    marginRight: 11,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#173a32',
    marginBottom: 2,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  meta: {
    fontSize: 11,
    color: '#8fa39d',
  },
  tag: {
    marginLeft: 5,
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 20,
    backgroundColor: '#f6f9f8',
  },
  tagText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#5b7770',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  actions: {
    flexShrink: 0,
    alignItems: 'flex-end',
    gap: 5,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 20,
  },
  statusIn: {
    backgroundColor: '#e7f6ef',
  },
  statusOut: {
    backgroundColor: '#f6f9f8',
  },
  statusText: {
    fontSize: 9.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  statusTextIn: {
    color: '#2f9e6e',
  },
  statusTextOut: {
    color: '#8fa39d',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 9,
  },
  actionIn: {
    backgroundColor: '#1c6e5a',
  },
  actionOut: {
    backgroundColor: '#fbeceb',
  },
  actionText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  actionTextIn: {
    color: '#ffffff',
  },
  actionTextOut: {
    color: '#e0574f',
  },
  cardDisabled: {
    opacity: 0.7,
    backgroundColor: '#fafcfb',
  },
  tagDisabled: {
    backgroundColor: '#eef2f1',
  },
  actionInDisabled: {
    backgroundColor: '#e3ece9',
  },
  actionTextInDisabled: {
    color: '#a3b8b2',
  },
});
