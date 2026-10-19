import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { Text } from '@/shared/components/AppText';
import { useRouter, useSegments } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '@/shared/components/AppHeader';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { BrandColors, Spacing } from '@/core/theme';
import { useTabBarBottomInset } from '@/shared/layouts/ScreenLayout';
import { useCurrency } from '@/core/providers';
import { useMessagingAnalytics, useMessagingHistory } from '../../hooks/useMessagingHooks';
import { MESSAGING_CHANNELS, getChannel } from '../channels';
import { MessagingColors } from '../theme';

const formatPct = (value: number) => `${(Number.isFinite(value) ? value : 0).toFixed(1)}%`;

const formatShortDate = (date: Date) =>
  date.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });

/**
 * Mobile counterpart of the Analytics tab on the web messaging page
 * (Gym-frontend/src/pages/messaging.tsx): summary figures, performance per
 * channel, and recent activity. Like the web page, the summary comes from
 * GET /messaging/analytics and the per-channel figures are derived from the
 * campaign history (the backend returns the latest 200 campaigns).
 */
export function MessagingAnalyticsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const segments = useSegments();
  const roleGroup = segments[0] || '(admin)';
  const { formatCurrency } = useCurrency();
  // Keeps the last section clear of the floating tab bar.
  const bottomInset = useTabBarBottomInset() + Spacing.six;

  let headerColors: [string, string] = [BrandColors.teal, BrandColors.tealDark];
  if (roleGroup === '(trainer)') {
    headerColors = [BrandColors.trainerAmber, '#ea580c'];
  } else if (roleGroup === '(member)') {
    headerColors = [BrandColors.memberGold, BrandColors.trainerAmber];
  }

  const analyticsQuery = useMessagingAnalytics();
  const historyQuery = useMessagingHistory();
  const analytics = analyticsQuery.data;
  const history = historyQuery.data ?? [];

  const isLoading = analyticsQuery.isLoading || historyQuery.isLoading;
  const isRefreshing = analyticsQuery.isRefetching || historyQuery.isRefetching;
  const loadError = analyticsQuery.error || historyQuery.error;

  const onRefresh = () => {
    analyticsQuery.refetch();
    historyQuery.refetch();
  };

  // Every standard channel is always listed (as on the web), plus any other type
  // that shows up in history so nothing sent is silently left out of the totals.
  const channelStats = useMemo(() => {
    const extraTypes = Array.from(new Set(history.map((m) => m.type))).filter(
      (typeKey) => !MESSAGING_CHANNELS.some((c) => c.id === typeKey)
    );
    const channels = [...MESSAGING_CHANNELS, ...extraTypes.map(getChannel)];
    return channels.map((channel) => {
      const messages = history.filter((m) => m.type === channel.id);
      const count = messages.length;
      const avg = (pick: (m: (typeof messages)[number]) => number) =>
        count > 0 ? messages.reduce((sum, m) => sum + pick(m), 0) / count : 0;
      return {
        channel,
        count,
        recipients: messages.reduce((sum, m) => sum + m.recipientCount, 0),
        openRate: avg((m) => m.openRate),
        deliveryRate: avg((m) => m.deliveryRate),
      };
    });
  }, [history]);

  const overallDelivery = useMemo(() => {
    const sent = history.filter((m) => m.status !== 'scheduled');
    return sent.length > 0 ? sent.reduce((sum, m) => sum + m.deliveryRate, 0) / sent.length : 0;
  }, [history]);

  const maxChannelCount = Math.max(1, ...channelStats.map((c) => c.count));
  const recent = history.slice(0, 5);

  const summaryCards: { label: string; value: string; icon: keyof typeof Feather.glyphMap; color: string; tint: string }[] = useMemo(() => [
    { label: t('messaging.analytics.totalMessages'), value: String(history.length), icon: 'send', color: MessagingColors.dark, tint: MessagingColors.tint },
    { label: t('messaging.analytics.avgOpenRate'), value: formatPct(analytics?.openRate ?? 0), icon: 'eye', color: '#3B82F6', tint: '#E6EFFD' },
    { label: t('messaging.analytics.avgClickRate'), value: formatPct(analytics?.clickRate ?? 0), icon: 'mouse-pointer', color: MessagingColors.sms, tint: MessagingColors.smsTint },
    { label: t('messaging.analytics.totalCost'), value: formatCurrency(analytics?.totalCost ?? 0), icon: 'credit-card', color: MessagingColors.push, tint: MessagingColors.pushTint },
  ], [history.length, analytics, t, formatCurrency]);

  const miniStats = useMemo(() => [
    { label: t('messaging.analytics.sentToday'), value: analytics?.sentToday ?? 0 },
    { label: t('messaging.analytics.scheduled'), value: analytics?.scheduledMessages ?? 0 },
    { label: t('messaging.analytics.recipients'), value: analytics?.totalRecipients ?? 0 },
    { label: t('messaging.analytics.delivered'), value: formatPct(overallDelivery) },
  ], [analytics, overallDelivery, t]);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <AppHeader
        title={t('messaging.analytics.title')}
        subtitle={t('messaging.analytics.subtitle')}
        colors={headerColors}
        onBack={() => router.back()}
      />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={MessagingColors.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset }]}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={MessagingColors.accent} />}
        >
          {loadError && (
            <View style={styles.errorBanner}>
              <Feather name="alert-circle" size={15} color="#B42318" />
              <Text style={styles.errorText}>{t('messaging.analytics.loadError')}</Text>
            </View>
          )}

          <View style={styles.grid}>
            {summaryCards.map((card) => (
              <View key={card.label} style={styles.summaryCard}>
                <View style={[styles.summaryIcon, { backgroundColor: card.tint }]}>
                  <Feather name={card.icon} size={15} color={card.color} />
                </View>
                <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>
                  {card.value}
                </Text>
                <Text style={styles.summaryLabel}>{card.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.miniRow}>
            {miniStats.map((s, i) => (
              <View key={s.label} style={[styles.miniStat, i > 0 && styles.miniStatDivider]}>
                <Text style={styles.miniValue}>{s.value}</Text>
                <Text style={styles.miniLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>{t('messaging.analytics.performanceByType')}</Text>
          <View style={styles.card}>
            {channelStats.map(({ channel, count, recipients, openRate, deliveryRate }, i) => (
              <View key={channel.id} style={[styles.channelRow, i > 0 && styles.rowDivider]}>
                <View style={styles.channelHead}>
                  <View style={[styles.channelIcon, { backgroundColor: channel.tint }]}>
                    <Feather name={channel.icon} size={15} color={channel.color} />
                  </View>
                  <View style={styles.channelMeta}>
                    <Text style={styles.channelName}>{channel.label}</Text>
                    <Text style={styles.channelSub}>
                      {t('messaging.analytics.sentAndRecipients', { count, recipients })}
                    </Text>
                  </View>
                  <View style={styles.channelRates}>
                    <Text style={styles.channelRate}>{formatPct(openRate)}</Text>
                    <Text style={styles.channelRateLabel}>{t('messaging.analytics.openRateLabel')}</Text>
                  </View>
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${(count / maxChannelCount) * 100}%`, backgroundColor: channel.color },
                    ]}
                  />
                </View>
                {count > 0 && (
                  <Text style={styles.channelFoot}>
                    {t('messaging.analytics.deliveredLabel', { rate: formatPct(deliveryRate) })}
                  </Text>
                )}
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>{t('messaging.analytics.recentActivity')}</Text>
          <View style={styles.card}>
            {recent.length === 0 ? (
              <View style={styles.empty}>
                <Feather name="inbox" size={22} color={MessagingColors.faint} />
                <Text style={styles.emptyText}>{t('messaging.analytics.noMessages')}</Text>
              </View>
            ) : (
              recent.map((message, i) => {
                const channel = getChannel(message.type);
                return (
                  <View key={message.id} style={[styles.activityRow, i > 0 && styles.rowDivider]}>
                    <View style={[styles.channelIcon, { backgroundColor: channel.tint }]}>
                      <Feather name={channel.icon} size={15} color={channel.color} />
                    </View>
                    <View style={styles.activityMeta}>
                      <Text style={styles.activitySubject} numberOfLines={1}>
                        {message.subject || message.content || t('messaging.compose.noSubject')}
                      </Text>
                      <Text style={styles.activitySub}>
                        {t('messaging.analytics.recipientsAndDate', {
                          recipients: message.recipientCount,
                          date: formatShortDate(message.sentDate),
                        })}
                      </Text>
                    </View>
                    <StatusBadge status={message.status} />
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: MessagingColors.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FDECEC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    color: '#B42318',
    fontSize: 12.5,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    // Two per row: (100% - one 10px gap) / 2
    width: '48.5%',
    flexGrow: 1,
    backgroundColor: MessagingColors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: MessagingColors.line,
  },
  summaryIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: MessagingColors.ink,
  },
  summaryLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: MessagingColors.muted,
    marginTop: 2,
  },
  miniRow: {
    flexDirection: 'row',
    backgroundColor: MessagingColors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MessagingColors.line,
    paddingVertical: 12,
    marginTop: 10,
  },
  miniStat: {
    flex: 1,
    alignItems: 'center',
  },
  miniStatDivider: {
    borderLeftWidth: 1,
    borderLeftColor: MessagingColors.line,
  },
  miniValue: {
    fontSize: 15,
    fontWeight: '800',
    color: MessagingColors.ink,
  },
  miniLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: MessagingColors.faint,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: MessagingColors.faint,
    marginTop: 22,
    marginBottom: 9,
  },
  card: {
    backgroundColor: MessagingColors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MessagingColors.line,
    paddingHorizontal: 14,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: MessagingColors.line,
  },
  channelRow: {
    paddingVertical: 13,
  },
  channelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  channelIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelMeta: {
    flex: 1,
  },
  channelName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: MessagingColors.ink,
  },
  channelSub: {
    fontSize: 11.5,
    color: MessagingColors.muted,
    marginTop: 1,
  },
  channelRates: {
    alignItems: 'flex-end',
  },
  channelRate: {
    fontSize: 14,
    fontWeight: '800',
    color: MessagingColors.ink,
  },
  channelRateLabel: {
    fontSize: 10.5,
    color: MessagingColors.faint,
    fontWeight: '600',
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: MessagingColors.bg,
    marginTop: 10,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  channelFoot: {
    fontSize: 10.5,
    color: MessagingColors.muted,
    fontWeight: '600',
    marginTop: 5,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  activityMeta: {
    flex: 1,
    minWidth: 0,
  },
  activitySubject: {
    fontSize: 13,
    fontWeight: '700',
    color: MessagingColors.ink,
  },
  activitySub: {
    fontSize: 11.5,
    color: MessagingColors.muted,
    marginTop: 1,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  emptyText: {
    fontSize: 12.5,
    color: MessagingColors.muted,
  },
});
