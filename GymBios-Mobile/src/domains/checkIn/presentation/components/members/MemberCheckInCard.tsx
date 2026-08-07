import { View, StyleSheet } from 'react-native';
import { Avatar } from '@/shared/components/Avatar';
import { Typography } from '@/shared/components/Typography';
import { Button } from '@/shared/components/Button';
import { Surface } from '@/shared/components/Surface';
import { Radius, Spacing } from '@/core/theme';
import { MemberStatusBadge } from './MemberStatusBadge';

export interface MemberCheckInCardProps {
  member: any; // Assuming member domain type isn't fully exported or structured here
  onCheckIn: (member: any) => void;
  isActive?: boolean;
}

export function MemberCheckInCard({ member, onCheckIn, isActive }: MemberCheckInCardProps) {
  const name = member.name || 'Unknown Member';
  const id = member.bizId || member.memberNumber || member.id;
  const type = member.membershipType || 'INDIVIDUAL';
  const avatarUrl = member.photoUrl;

  return (
    <Surface style={styles.card}>
      <View style={styles.leftContent}>
        <Avatar url={avatarUrl} name={name} size={40} style={styles.avatar} />
        <View style={styles.info}>
          <Typography variant="body" style={styles.name}>{name}</Typography>
          <Typography variant="caption" color="textSecondary">
            {id} • {type}
          </Typography>
        </View>
      </View>
      
      <View style={styles.actions}>
        {isActive && <MemberStatusBadge isActive={true} statusText="Active" />}
        <Button 
          label={isActive ? "Checked In" : "Check In"} 
          onPress={() => !isActive && onCheckIn(member)}
          disabled={isActive}
          variant={isActive ? "outline" : "primary"}
          style={[styles.button, isActive && styles.buttonDisabled]}
          textStyle={styles.buttonText}
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
    marginRight: Spacing.three,
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
  },
  buttonText: {
    fontSize: 12,
  }
});
