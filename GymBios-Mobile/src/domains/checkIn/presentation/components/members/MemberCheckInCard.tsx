import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/shared/components/Avatar';
import { Typography } from '@/shared/components/Typography';
import { Button } from '@/shared/components/Button';
import { Surface } from '@/shared/components/Surface';
import { Radius, Spacing } from '@/core/theme';
import { MemberStatusBadge } from './MemberStatusBadge';
import { getCheckInEligibility } from '../../../domain/membershipEligibility';

export interface MemberCheckInCardProps {
  member: any; // Assuming member domain type isn't fully exported or structured here
  onCheckIn: (member: any) => void;
  isActive?: boolean;
}

export function MemberCheckInCard({ member, onCheckIn, isActive }: MemberCheckInCardProps) {
  const { t } = useTranslation();
  const name = member.name || t('checkIn.members.unknownMember');
  const id = member.bizId || member.memberNumber || member.id;
  const type = member.membershipType || 'INDIVIDUAL';
  const avatarUrl = member.photoUrl;
  const { eligible, label } = getCheckInEligibility(member);

  return (
    <Surface style={styles.card}>
      <View style={styles.leftContent}>
        <Avatar imageUrl={avatarUrl} initials={name.substring(0, 2).toUpperCase()} size={40} />
        <View style={styles.info}>
          <Typography variant="body" style={styles.name}>{name}</Typography>
          <Typography variant="caption" color="textSecondary">
            {id} • {type}
          </Typography>
        </View>
      </View>
      
      <View style={styles.actions}>
        {isActive
          ? <MemberStatusBadge isActive={true} statusText={t('checkIn.members.checkedIn')} />
          : <MemberStatusBadge isActive={eligible} statusText={label} />}
        <Button 
          label={isActive ? t('checkIn.members.checkedIn') : eligible ? t('checkIn.members.checkIn') : t('checkIn.members.notEligible')} 
          onPress={() => !isActive && eligible && onCheckIn(member)}
          disabled={isActive || !eligible}
          variant={isActive || !eligible ? "ghost" : "primary"}
          style={[styles.button, (isActive || !eligible) && styles.buttonDisabled]}
        />
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    marginBottom: Spacing.two,
    borderRadius: Radius.md,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    marginEnd: Spacing.three,
  },
  info: {
    flex: 1,
  },
  name: {
    fontWeight: '600',
    marginBottom: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  button: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: 32,
  },
  buttonDisabled: {
    opacity: 0.6,
  }
});
