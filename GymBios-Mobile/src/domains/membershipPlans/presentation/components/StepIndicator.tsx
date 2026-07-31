import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

interface StepIndicatorProps {
  current: number;
  total: number;
  labels: string[];
}

export function StepIndicator({ current, total, labels }: StepIndicatorProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Typography variant="caption" color="textSecondary" style={styles.stepLabel}>
        Step {current} of {total}
      </Typography>

      <View style={styles.dots}>
        {Array.from({ length: total }, (_, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === current;
          const isCompleted = stepNumber < current;

          return (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: isActive
                    ? theme.primary
                    : isCompleted
                      ? theme.primary + '60'
                      : theme.muted,
                  width: isActive ? 24 : 8,
                  borderRadius: isActive ? Radius.sm : Radius.full,
                },
              ]}
            />
          );
        })}
      </View>

      {labels.length > 0 && (
        <View style={styles.labels}>
          {labels.map((label, index) => {
            const stepNumber = index + 1;
            const isActive = stepNumber === current;

            return (
              <Typography
                key={index}
                variant="caption"
                color="textSecondary"
                style={[styles.label, isActive && styles.activeLabel]}
              >
                {label}
              </Typography>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  stepLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  dot: {
    height: 8,
    borderRadius: Radius.full,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: Spacing.two,
  },
  label: {
    textAlign: 'center',
  },
  activeLabel: {
    fontWeight: '700',
  },
});
