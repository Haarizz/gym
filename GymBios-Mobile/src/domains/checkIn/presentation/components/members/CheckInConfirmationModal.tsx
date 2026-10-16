import { View, StyleSheet, Modal, TouchableWithoutFeedback } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Typography } from '@/shared/components/Typography';
import { Button } from '@/shared/components/Button';
import { Avatar } from '@/shared/components/Avatar';
import { Radius, Spacing, BrandColors } from '@/core/theme';
import { formatDate } from '@/core/i18n';
import { MemberStatusBadge } from './MemberStatusBadge';

interface CheckInConfirmationModalProps {
  visible: boolean;
  member: any;
  actionType?: 'checkIn' | 'checkOut';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function CheckInConfirmationModal({
  visible,
  member,
  actionType = 'checkIn',
  onConfirm,
  onCancel,
  isLoading,
}: CheckInConfirmationModalProps) {
  const { t } = useTranslation();
  if (!member) return null;

  const name = member.name || t('checkIn.members.unknownMember');
  const id = member.bizId || member.memberNumber || member.id;
  const type = member.membershipType || 'INDIVIDUAL';
  
  const now = new Date();
  const currentDate = formatDate(now, 'PP');
  const currentTime = formatDate(now, 'p');

  const isCheckIn = actionType === 'checkIn';

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.content}>
              <Typography variant="subtitle" style={styles.title}>
                {isCheckIn ? t('checkIn.members.confirmCheckInTitle') : t('checkIn.members.confirmCheckOutTitle')}
              </Typography>
              <Typography variant="bodySmall" color="textSecondary" style={styles.subtitle}>
                {isCheckIn
                  ? t('checkIn.members.checkingInSubtitle', { name })
                  : t('checkIn.members.checkingOutSubtitle', { name })}
              </Typography>
              
              <View style={styles.memberInfoRow}>
                <Avatar imageUrl={member.photoUrl} initials={name.substring(0, 2).toUpperCase()} size={48} />
                <View style={styles.memberDetails}>
                  <Typography variant="subtitle" style={styles.memberName}>{name}</Typography>
                  <Typography variant="caption" color="textSecondary" style={styles.memberId}>{id}</Typography>
                  <MemberStatusBadge isActive={true} statusText={type} />
                </View>
              </View>

              <View style={styles.timeRow}>
                <View style={styles.timeCol}>
                  <Typography variant="caption" color="textSecondary">
                    {isCheckIn ? t('checkIn.members.checkInTime') : t('checkIn.members.checkOutTime')}
                  </Typography>
                  <Typography variant="body">{currentTime}</Typography>
                </View>
                <View style={styles.timeCol}>
                  <Typography variant="caption" color="textSecondary">
                    {t('checkIn.members.date')}
                  </Typography>
                  <Typography variant="body">{currentDate}</Typography>
                </View>
              </View>

              <View style={styles.actions}>
                <Button
                  label={t('checkIn.members.cancel')}
                  variant="ghost"
                  onPress={onCancel}
                  style={styles.cancelBtn}
                  disabled={isLoading}
                />
                <Button 
                  label={isCheckIn ? t('checkIn.members.confirmCheckInBtn') : t('checkIn.members.confirmCheckOutBtn')} 
                  variant="primary" 
                  onPress={onConfirm} 
                  style={[styles.confirmBtn, !isCheckIn && { backgroundColor: BrandColors.danger }]} 
                  loading={isLoading} 
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    marginBottom: Spacing.one,
  },
  subtitle: {
    marginBottom: Spacing.four,
  },
  memberInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  avatar: {
    marginEnd: Spacing.three,
  },
  memberDetails: {
    flex: 1,
    alignItems: 'flex-start',
  },
  memberName: {
    marginBottom: 2,
  },
  memberId: {
    marginBottom: 4,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.six,
  },
  timeCol: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.three,
  },
  cancelBtn: {
    flex: 1,
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: BrandColors.teal,
  }
});
