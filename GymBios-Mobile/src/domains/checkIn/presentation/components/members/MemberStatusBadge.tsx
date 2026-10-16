import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

interface MemberStatusBadgeProps {
  isActive: boolean;
  statusText?: string;
}

export function MemberStatusBadge({ isActive, statusText }: MemberStatusBadgeProps) {
  const { t } = useTranslation();
  if (!isActive && !statusText) return null;

  const getLocalizedText = () => {
    if (!statusText) return isActive ? t('checkIn.status.active') : t('checkIn.status.inactive');
    const lower = statusText.trim().toLowerCase();
    if (lower === 'checked in') return t('checkIn.members.checkedIn');
    if (lower === 'active') return t('checkIn.status.active');
    if (lower === 'inactive') return t('checkIn.status.inactive');
    if (lower === 'paid') return t('checkIn.status.paid');
    if (lower === 'pending') return t('checkIn.status.pending');
    if (lower === 'no membership') return t('checkIn.status.noMembership');
    if (lower === 'expired') return t('checkIn.status.expired');
    if (lower === 'frozen') return t('checkIn.status.frozen');
    return statusText;
  };
  
  return (
    <View style={[styles.badge, isActive ? styles.active : styles.inactive]}>
      <Typography variant="caption" style={[styles.text, isActive ? styles.activeText : styles.inactiveText]}>
        {getLocalizedText()}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  active: {
    backgroundColor: '#E6F4EA', // Light green
  },
  inactive: {
    backgroundColor: '#F1F3F4',
  },
  text: {
    fontWeight: '600',
    fontSize: 10,
  },
  activeText: {
    color: BrandColors.teal,
  },
  inactiveText: {
    color: BrandColors.textSecondary,
  }
});
