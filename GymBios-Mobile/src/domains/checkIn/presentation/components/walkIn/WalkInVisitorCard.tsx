import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Surface } from '@/shared/components/Surface';
import { Avatar } from '@/shared/components/Avatar';
import { Typography } from '@/shared/components/Typography';
import { MemberStatusBadge } from '../members/MemberStatusBadge';
import { Radius, Spacing } from '@/core/theme';
import { formatDate } from '@/core/i18n';

interface WalkInVisitorCardProps {
  visitor: any;
}

export function WalkInVisitorCard({ visitor }: WalkInVisitorCardProps) {
  const { t } = useTranslation();
  const name = visitor.walkInName || visitor.memberName || t('checkIn.members.unknownMember');
  const phone = visitor.walkInPhone || t('checkIn.walkIn.noPhone');
  
  const inTime = visitor.checkInTime ? formatDate(visitor.checkInTime, 'p') : '--:--';

  return (
    <Surface style={styles.card}>
      <View style={styles.avatar}>
        <Avatar imageUrl={visitor.photoUrl} initials={name.substring(0, 2).toUpperCase()} size={40} />
      </View>
      <View style={styles.info}>
        <Typography variant="body" style={styles.name}>{name}</Typography>
        <Typography variant="caption" color="textSecondary">{phone}</Typography>
        <Typography variant="caption" color="textSecondary">
          {t('checkIn.members.inTime', { time: inTime })}
        </Typography>
      </View>
      <View style={styles.status}>
        <MemberStatusBadge isActive={visitor.status === 'In Gym'} statusText={visitor.status || 'Active'} />
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    marginBottom: Spacing.two,
    borderRadius: Radius.md,
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
  status: {
    alignItems: 'flex-end',
  }
});
