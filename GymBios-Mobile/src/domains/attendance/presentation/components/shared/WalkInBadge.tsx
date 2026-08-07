import { StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

export function WalkInBadge() {
  return (
    <View style={styles.badge}>
      <Typography variant="caption" style={styles.text}>
        Walk-in
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
