import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/shared/components/Avatar';
import { Typography } from '@/shared/components/Typography';
import { Button } from '@/shared/components/Button';
import { Surface } from '@/shared/components/Surface';
import { Radius, Spacing, BrandColors } from '@/core/theme';
import { formatDate } from '@/core/i18n';
import Feather from '@expo/vector-icons/Feather';

export interface RecentCheckInCardProps {
  record: any;
  onCheckOut?: (record: any) => void;
}

export function RecentCheckInCard({ record, onCheckOut }: RecentCheckInCardProps) {
  const { t } = useTranslation();
  const name = record.memberName || record.walkInName || t('checkIn.members.unknownMember');
  const id = record.memberBizId || record.membershipType || t('checkIn.walkIn.walkInPassFallback');
  const type = record.membershipType || (record.type === 'Walk-In' ? 'Walk-In' : 'INDIVIDUAL');
  const avatarUrl = record.photoUrl;
  
  const inTime = record.checkInTime ? formatDate(record.checkInTime, 'p') : '--:--';
  const outTime = record.checkOutTime ? formatDate(record.checkOutTime, 'p') : null;
  const isCompleted = !!record.checkOutTime || record.status === 'Completed';
  
  const method = record.checkInMethod || 'Manual';

  const initials = name.substring(0, 2).toUpperCase();

  return (
    <Surface style={styles.card}>
      <View style={styles.content}>
        <Avatar imageUrl={avatarUrl} initials={initials} size={40} />
        <View style={styles.info}>
          <Typography variant="body" style={styles.name}>{name}</Typography>
          <Typography variant="caption" color="textSecondary">
            {id} • {type}
          </Typography>
          <Typography variant="caption" color="textSecondary" style={styles.timeInfo}>
            {outTime
              ? t('checkIn.members.inTimeInfo', { inTime, outTime })
              : t('checkIn.members.inTime', { time: inTime })}
          </Typography>
        </View>
        <View style={styles.statusSection}>
          {isCompleted ? (
            <>
              <Typography variant="caption" style={styles.completedText}>
                {t('checkIn.members.completed')}
              </Typography>
              <Typography variant="caption" color="textSecondary">{method}</Typography>
            </>
          ) : (
            <>
              <View style={styles.inGymBadge}>
                <Feather name="check-circle" size={12} color={BrandColors.teal} style={styles.inGymIcon} />
                <Typography variant="caption" style={styles.inGymText}>
                  {t('checkIn.members.inGym')}
                </Typography>
              </View>
              {onCheckOut && (
                <Button 
                  label={t('checkIn.members.checkOut')} 
                  variant="ghost" 
                  onPress={() => onCheckOut(record)} 
                  style={styles.checkOutButton}
                />
              )}
            </>
          )}
        </View>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    marginBottom: Spacing.two,
    borderRadius: Radius.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  timeInfo: {
    marginTop: 4,
  },
  statusSection: {
    alignItems: 'flex-end',
  },
  completedText: {
    fontWeight: '600',
  },
  inGymBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  inGymIcon: {
    marginEnd: 4,
  },
  inGymText: {
    color: BrandColors.teal,
    fontWeight: '600',
  },
  checkOutButton: {
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 4,
    minHeight: 28,
  }
});
