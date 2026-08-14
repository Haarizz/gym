import { StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import type { ReportInsight } from '../../../domain/AttendanceReport';
import { AttendanceSection } from '../shared';

interface InsightsListProps {
  insights: ReportInsight[];
}

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

interface InsightStyle {
  container: { backgroundColor: string; borderLeftColor: string };
  iconName: FeatherIconName;
  iconColor: string;
}

/** Maps backend insight.type → visual style tokens. */
function getInsightStyle(type?: string): InsightStyle {
  switch (type) {
    case 'success':
      return {
        container: { backgroundColor: '#f0fdf4', borderLeftColor: '#16a34a' },
        iconName: 'check-circle',
        iconColor: '#16a34a',
      };
    case 'warning':
      return {
        container: { backgroundColor: '#fffbeb', borderLeftColor: '#d97706' },
        iconName: 'alert-triangle',
        iconColor: '#d97706',
      };
    case 'info':
    default:
      return {
        container: { backgroundColor: '#eff6ff', borderLeftColor: '#2563eb' },
        iconName: 'info',
        iconColor: '#2563eb',
      };
  }
}

export function InsightsList({ insights }: InsightsListProps) {
  if (insights.length === 0) {
    return null;
  }

  return (
    <AttendanceSection title="Insights">
      <View style={styles.list}>
        {insights.map((insight) => {
          const { container, iconName, iconColor } = getInsightStyle(insight.type);
          return (
            <View
              key={insight.id}
              style={[styles.item, container, styles.itemBorder]}
            >
              <View style={styles.iconWrap}>
                <Feather name={iconName} size={16} color={iconColor} />
              </View>
              <View style={styles.textBlock}>
                {insight.title ? (
                  <Typography variant="bodySmallBold" style={{ color: iconColor }}>
                    {insight.title}
                  </Typography>
                ) : null}
                {insight.message ? (
                  <Typography variant="bodySmall" style={styles.message}>
                    {insight.message}
                  </Typography>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </AttendanceSection>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  itemBorder: {
    borderLeftWidth: 3,
  },
  iconWrap: {
    marginTop: 2,
  },
  textBlock: {
    flex: 1,
    gap: 4,
  },
  message: {
    lineHeight: 20,
    color: '#374151',
  },
});
