import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { Button } from '@/shared/components/Button';
import { EmptyState } from '@/shared/components/EmptyState';
import { Loader } from '@/shared/components/Loader';
import { Typography } from '@/shared/components/Typography';

import type { ChartContainerProps } from './types';

export function ChartContainer({
  title,
  description,
  headerRight,
  loading = false,
  empty = false,
  error = null,
  emptyTitle = 'No data available',
  emptyDescription = 'There is no chart data to display for the selected criteria.',
  errorMessage,
  onRetry,
  height,
  style,
  contentStyle,
  children,
}: ChartContainerProps) {
  const theme = useTheme();

  const errText =
    errorMessage ??
    (typeof error === 'string'
      ? error
      : error && typeof error === 'object' && 'message' in error
        ? String(error.message)
        : 'Failed to load chart data');

  const renderContent = () => {
    if (loading) {
      return (
        <View style={[styles.stateContainer, height ? { height } : styles.defaultHeight]}>
          <Loader message="Loading chart..." />
        </View>
      );
    }

    if (error) {
      return (
        <View style={[styles.stateContainer, height ? { height } : styles.defaultHeight]}>
          <Feather name="alert-circle" size={36} color={theme.error} style={styles.stateIcon} />
          <Typography variant="subtitle" style={{ color: theme.error, textAlign: 'center' }}>
            Unable to Load Chart
          </Typography>
          <Typography
            variant="bodySmall"
            color="textSecondary"
            style={{ textAlign: 'center', marginTop: 4, marginBottom: Spacing.three }}
          >
            {errText}
          </Typography>
          {onRetry ? (
            <Button label="Retry" onPress={onRetry} variant="secondary" style={{ minWidth: 120 }} />
          ) : null}
        </View>
      );
    }

    if (empty) {
      return (
        <View style={[styles.stateContainer, height ? { height } : styles.defaultHeight]}>
          <EmptyState title={emptyTitle} description={emptyDescription} icon="bar-chart-2" />
        </View>
      );
    }

    return <View style={contentStyle}>{children}</View>;
  };

  const hasHeader = title || description || headerRight;

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }, style]}>
      {hasHeader ? (
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            {title ? (
              <Typography variant="subtitle" style={styles.title}>
                {title}
              </Typography>
            ) : null}
            {description ? (
              <Typography variant="caption" color="textSecondary" style={styles.description}>
                {description}
              </Typography>
            ) : null}
          </View>
          {headerRight ? <View style={styles.headerRight}>{headerRight}</View> : null}
        </View>
      ) : null}

      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginVertical: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
    gap: Spacing.two,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontWeight: '700',
  },
  description: {
    marginTop: Spacing.half,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  stateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.two,
  },
  defaultHeight: {
    minHeight: 180,
  },
  stateIcon: {
    marginBottom: Spacing.two,
  },
});
