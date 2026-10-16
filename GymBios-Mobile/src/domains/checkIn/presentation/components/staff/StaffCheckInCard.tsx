import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from '@/shared/components/AppText';
import Feather from '@expo/vector-icons/Feather';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/shared/components/Avatar';
import { Radius, Spacing } from '@/core/theme';
import { getCheckInEligibility } from '../../../domain/membershipEligibility';

export interface StaffCheckInCardProps {
  person: any; // Can be a member or staff
  onCheckIn: (person: any) => void;
  onCheckOut: (person: any) => void;
  isActive?: boolean;
}

export function StaffCheckInCard({ person, onCheckIn, onCheckOut, isActive }: StaffCheckInCardProps) {
  const { t } = useTranslation();
  const name = person.name || t('checkIn.members.unknownMember');
  // Fallbacks across Member and Staff domains
  const id = person.bizId || person.memberNumber || person.id;
  const role = person.membershipType || person.role || person.department || 'User';
  const avatarUrl = person.photoUrl;
  
  const initials = name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
  const { eligible, label: statusLabel } = getCheckInEligibility(person);
  // Someone already in the gym can always be checked out, whatever their status.
  const hasMembership = isActive || eligible;

  const getLocalizedStatusLabel = (label: string) => {
    const lower = label.trim().toLowerCase();
    if (lower === 'active') return t('checkIn.status.active');
    if (lower === 'inactive') return t('checkIn.status.inactive');
    if (lower === 'paid') return t('checkIn.status.paid');
    if (lower === 'pending') return t('checkIn.status.pending');
    if (lower === 'no membership') return t('checkIn.status.noMembership');
    if (lower === 'expired') return t('checkIn.status.expired');
    if (lower === 'frozen') return t('checkIn.status.frozen');
    return label;
  };

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
            <View style={[styles.tag, hasMembership ? styles.membershipOk : styles.membershipBad]}>
              <Text style={[styles.tagText, hasMembership ? styles.membershipOkText : styles.membershipBadText]}>
                {getLocalizedStatusLabel(statusLabel)}
              </Text>
            </View>
          </View>
        </View>
      </View>
      
      <View style={styles.actions}>
        {isActive ? (
          <>
            <View style={[styles.statusPill, styles.statusIn]}>
              <Feather name="check" size={10} color="#2f9e6e" style={{ marginEnd: 3 }} />
              <Text style={[styles.statusText, styles.statusTextIn]}>{t('checkIn.members.inGym')}</Text>
            </View>
            <Pressable 
              style={[styles.actionBtn, styles.actionOut]} 
              onPress={() => onCheckOut(person)}
            >
              <Feather name="log-out" size={12} color="#e0574f" />
              <Text style={[styles.actionText, styles.actionTextOut]}>{t('checkIn.members.checkOut')}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={[styles.statusPill, styles.statusOut]}>
              <Text style={[styles.statusText, styles.statusTextOut]}>{t('checkIn.staff.notIn')}</Text>
            </View>
            <Pressable 
              style={[styles.actionBtn, styles.actionIn, !hasMembership && styles.actionInDisabled]} 
              onPress={() => hasMembership && onCheckIn(person)}
              disabled={!hasMembership}
            >
              <Feather name="log-in" size={12} color={hasMembership ? "#ffffff" : "#a3b8b2"} />
              <Text style={[styles.actionText, styles.actionTextIn, !hasMembership && styles.actionTextInDisabled]}>
                {hasMembership ? t('checkIn.members.checkIn') : t('checkIn.members.notEligible')}
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
    marginEnd: 11,
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
    marginStart: 5,
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
  membershipOk: {
    backgroundColor: '#e7f6ef',
  },
  membershipOkText: {
    color: '#2f9e6e',
  },
  membershipBad: {
    backgroundColor: '#fbeceb',
  },
  membershipBadText: {
    color: '#c2453d',
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
