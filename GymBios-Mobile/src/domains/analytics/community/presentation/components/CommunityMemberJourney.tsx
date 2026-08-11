import React from 'react';
import { StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Surface, Typography } from '@/shared/components';
import type { RetentionFunnelStage } from '../../domain/communityAnalyticsData.types';

interface CommunityMemberJourneyProps {
  funnelData?: RetentionFunnelStage[];
}

export function CommunityMemberJourney({ funnelData = [] }: CommunityMemberJourneyProps) {
  const isEmpty = funnelData.length === 0;

  return (
    <Surface background="backgroundElement" style={styles.card}>
      <Typography variant="bodySmallBold" style={styles.title}>
        Member Journey
      </Typography>

      {isEmpty ? (
        <View style={styles.emptyContainer}>
          <Typography variant="caption" color="textSecondary">
            No retention data available.
          </Typography>
        </View>
      ) : (
        <View style={styles.funnelContainer}>
          {funnelData.map((stage, idx) => {
            const isLast = idx === funnelData.length - 1;
            return (
              <React.Fragment key={stage.name}>
                <View style={styles.stageCard}>
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: `${stage.color || BrandColors.teal}1F` },
                    ]}
                  >
                    <Feather
                      name={
                        idx === 0 ? 'user-plus' : idx === 1 ? 'user-check' : 'refresh-cw'
                      }
                      size={18}
                      color={stage.color || BrandColors.teal}
                    />
                  </View>

                  <View style={styles.stageInfo}>
                    <Typography variant="caption" color="textSecondary" style={styles.stageName}>
                      {stage.name}
                    </Typography>
                    <Typography variant="bodySmallBold" style={styles.stageValue}>
                      {stage.value.toLocaleString()}
                    </Typography>
                  </View>
                </View>

                {!isLast && (
                  <View style={styles.connectorContainer}>
                    <Feather name="arrow-down" size={16} color="rgba(0,0,0,0.3)" />
                  </View>
                )}
              </React.Fragment>
            );
          })}
        </View>
      )}
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
  title: {
    fontSize: 15,
    color: BrandColors.textPrimary,
  },
  emptyContainer: {
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  funnelContainer: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  stageCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageInfo: {
    flex: 1,
  },
  stageName: {
    fontSize: 12,
  },
  stageValue: {
    fontSize: 16,
    color: BrandColors.textPrimary,
    marginTop: 2,
  },
  connectorContainer: {
    paddingVertical: 2,
    alignItems: 'center',
  },
});
