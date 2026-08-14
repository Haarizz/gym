import React, { useState, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { useCurrency, CurrencyGlyph } from '@/core/providers/CurrencyProvider';
import { ReferralHeader } from '../components/ReferralHeader';
import { useReferralRules } from '../../hooks/useReferrals';

export function RewardRulesScreen() {
  const router = useRouter();
  const { currencyCode } = useCurrency();
  const { data: rules, isLoading, refetch } = useReferralRules();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const ruleList = rules ?? [];

  return (
    <View style={styles.screen}>
      <ReferralHeader
        title="Reward Rules"
        subtitle="Manage referral reward rules and conditions"
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BrandColors.teal}
            colors={[BrandColors.teal]}
          />
        }
      >
        <View style={styles.body}>
          <Typography variant="subtitle" style={styles.sectionTitle}>
            Active Reward Rules
          </Typography>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={BrandColors.teal} />
              <Typography variant="bodySmall" color="textSecondary" style={{ marginTop: 8 }}>
                Loading reward rules...
              </Typography>
            </View>
          ) : ruleList.length === 0 ? (
            <View style={styles.emptyCard}>
              <Feather name="sliders" size={32} color={BrandColors.textSecondary} style={{ opacity: 0.5 }} />
              <Typography variant="bodySmall" color="textSecondary" style={{ marginTop: 8 }}>
                No reward rules configured yet.
              </Typography>
            </View>
          ) : (
            ruleList.map((rule) => (
              <View key={rule.id} style={styles.ruleCard}>
                <View style={styles.ruleHeader}>
                  <View style={{ flex: 1 }}>
                    <Typography variant="subtitle" style={styles.ruleName}>
                      {rule.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Target: {rule.eligibility || 'Referrer'} • Trigger: {rule.conditionTrigger || 'Payment'}
                    </Typography>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      rule.isActive ? { backgroundColor: '#dcfce7' } : { backgroundColor: '#f1f5f9' },
                    ]}
                  >
                    <Typography
                      variant="caption"
                      style={[
                        styles.statusText,
                        rule.isActive ? { color: '#15803d' } : { color: '#475569' },
                      ]}
                    >
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </Typography>
                  </View>
                </View>

                <View style={styles.ruleDetails}>
                  <View style={styles.detailCol}>
                    <Typography variant="caption" color="textSecondary">
                      Reward Type
                    </Typography>
                    <Typography variant="bodySmall" style={styles.detailVal}>
                      {rule.type}
                    </Typography>
                  </View>

                  <View style={styles.detailCol}>
                    <Typography variant="caption" color="textSecondary">
                      Value
                    </Typography>
                    <Typography variant="subtitle" style={[styles.detailVal, { color: BrandColors.teal }]}>
                      {rule.unit === '%' ? (
                        `${rule.value}%`
                      ) : (
                        <>
                          <CurrencyGlyph code={currencyCode} /> {rule.value}
                        </>
                      )}
                    </Typography>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  body: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    marginBottom: Spacing.two,
  },
  loadingContainer: {
    padding: Spacing.five,
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
    padding: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleCard: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
    padding: Spacing.three,
    marginBottom: Spacing.two,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  ruleName: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  ruleDetails: {
    flexDirection: 'row',
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  detailCol: {
    flex: 1,
  },
  detailVal: {
    fontWeight: '700',
    marginTop: 2,
  },
});
