import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

export function WalkInBadge() {
  const { t } = useTranslation();

  return (
    <View style={styles.badge}>
      <Typography variant="caption" style={styles.text}>
        {t('attendance.cards.walkIn')}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  text: {
    color: '#1d4ed8',
    fontSize: 10,
    fontWeight: '600',
  },
});
