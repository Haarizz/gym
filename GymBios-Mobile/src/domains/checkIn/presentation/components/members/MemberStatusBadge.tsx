import { StyleSheet, View } from 'react-native';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

interface MemberStatusBadgeProps {
  isActive: boolean;
  statusText?: string;
}

export function MemberStatusBadge({ isActive, statusText }: MemberStatusBadgeProps) {
  if (!isActive && !statusText) return null;
  
  return (
    <View style={[styles.badge, isActive ? styles.active : styles.inactive]}>
      <Typography variant="caption" style={[styles.text, isActive ? styles.activeText : styles.inactiveText]}>
        {statusText || (isActive ? 'Active' : 'Inactive')}
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
