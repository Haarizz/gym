import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';

interface LoadingSkeletonProps {
  count?: number;
}

export function LoadingSkeleton({ count = 3 }: LoadingSkeletonProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={[styles.card, { backgroundColor: theme.backgroundElement }]}
        >
          <View style={styles.header}>
            <View style={[styles.avatar, { backgroundColor: theme.muted }]} />
            <View style={styles.headerLines}>
              <View style={[styles.line, { backgroundColor: theme.muted }]} />
              <View style={[styles.lineShort, { backgroundColor: theme.muted }]} />
            </View>
          </View>
          <View style={[styles.line, { backgroundColor: theme.muted }]} />
          <View style={[styles.lineShort, { backgroundColor: theme.muted }]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
    padding: Spacing.four,
  },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
  },
  headerLines: {
    flex: 1,
    gap: Spacing.one,
  },
  line: {
    height: 14,
    borderRadius: Radius.sm,
  },
  lineShort: {
    height: 14,
    width: '60%',
    borderRadius: Radius.sm,
  },
});