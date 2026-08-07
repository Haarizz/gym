import { View, StyleSheet } from 'react-native';
import { Surface } from '@/shared/components/Surface';
import { Avatar } from '@/shared/components/Avatar';
import { Typography } from '@/shared/components/Typography';
import { MemberStatusBadge } from '../members/MemberStatusBadge';
import { Radius, Spacing } from '@/core/theme';

interface WalkInVisitorCardProps {
  visitor: any;
}

export function WalkInVisitorCard({ visitor }: WalkInVisitorCardProps) {
  const name = visitor.walkInName || visitor.memberName || 'Unknown';
  const phone = visitor.walkInPhone || 'No phone';
  
  const inTime = visitor.checkInTime ? new Date(visitor.checkInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--';

  return (
    <Surface style={styles.card}>
      <Avatar url={visitor.photoUrl} name={name} size={40} style={styles.avatar} />
      <View style={styles.info}>
        <Typography variant="body" style={styles.name}>{name}</Typography>
        <Typography variant="caption" color="textSecondary">{phone}</Typography>
        <Typography variant="caption" color="textSecondary">In: {inTime}</Typography>
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
    marginRight: Spacing.three,
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
