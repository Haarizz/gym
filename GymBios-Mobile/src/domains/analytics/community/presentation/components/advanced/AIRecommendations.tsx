import React from 'react';
import { StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Surface, Typography } from '@/shared/components';
import type { RecommendationItem } from '../../../domain/communityAdvancedAnalyticsData.types';

interface AIRecommendationsProps {
  recommendations?: RecommendationItem[];
}

export function AIRecommendations({ recommendations = [] }: AIRecommendationsProps) {
  if (recommendations.length === 0) {
    return null;
  }

  return (
    <Surface background="backgroundElement" style={styles.card}>
      <View style={styles.header}>
        <Feather name="zap" size={18} color={BrandColors.teal} />
        <Typography variant="bodySmallBold" style={styles.title}>
          AI Recommendations
        </Typography>
      </View>

      <View style={styles.list}>
        {recommendations.map((item, idx) => {
          const isWarning = item.type === 'warning';
          const isSuccess = item.type === 'success';

          const iconName = isWarning ? 'alert-triangle' : isSuccess ? 'check-circle' : 'info';
          const accentColor = isWarning ? '#EF4444' : isSuccess ? '#10B981' : '#3B82F6';

          return (
            <View key={`${item.title}-${idx}`} style={styles.recItem}>
              <View style={[styles.iconCircle, { backgroundColor: `${accentColor}1A` }]}>
                <Feather name={iconName} size={18} color={accentColor} />
              </View>

              <View style={styles.content}>
                <Typography variant="bodySmallBold" style={styles.recTitle}>
                  {item.title}
                </Typography>
                <Typography variant="caption" color="textSecondary" style={styles.message}>
                  {item.message}
                </Typography>
                {item.action ? (
                  <View style={styles.actionRow}>
                    <Typography variant="caption" style={[styles.actionText, { color: accentColor }]}>
                      {item.action} →
                    </Typography>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.three,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    fontSize: 15,
    color: BrandColors.textPrimary,
  },
  list: {
    gap: Spacing.three,
  },
  recItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  recTitle: {
    fontSize: 13,
    color: BrandColors.textPrimary,
  },
  message: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  actionRow: {
    marginTop: Spacing.one,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
