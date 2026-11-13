import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { Text } from '@/shared/components/AppText';
import { Button } from '@/shared/components';
import { CurrencyValue } from '@/core/providers';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { useAuthStore } from '@/domains/auth/store/authStore';
import { membershipApi } from '@/domains/memberPortal/membership/infrastructure/membership.api';

interface MembershipCancelledScreenProps {
  gymName?: string | null;
  reason?: string | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}

/**
 * Shown in place of this gym's member screens when the gym cancelled the membership
 * (web Members › Cancel membership). The GymBios account is the person's own and keeps
 * working; the server still lets them read their payments here (TenantContextFilter's
 * CANCELLED_READ_PATH), so the history is listed. Rejoining happens at the gym, which
 * restarts the membership on this same account.
 */
export function MembershipCancelledScreen({ gymName, reason, onRefresh, isRefreshing }: MembershipCancelledScreenProps) {
  const { t, i18n } = useTranslation();
  const activeTenant = useAuthStore((s) => s.activeTenant);
  const payments = useQuery({
    queryKey: ['cancelled-membership-payments', activeTenant],
    queryFn: () => membershipApi.getMembershipPayments(),
    enabled: !!activeTenant,
    retry: false,
  });
  const rows = (payments.data ?? []).slice(0, 20);
  const fmtDate = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => { onRefresh(); void payments.refetch(); }}
          tintColor={BrandColors.memberGold}
          colors={[BrandColors.memberGold]}
        />
      }
    >
      <View style={styles.iconCircle}>
        <Feather name="user-x" size={34} color="#DC2626" />
      </View>
      <Text style={styles.title}>{t('approval.cancelledTitle')}</Text>
      <Text style={styles.subtitle}>
        {gymName ? t('approval.cancelledAtGym', { gym: gymName }) : t('approval.cancelledGeneric')}
      </Text>
      {!!reason?.trim() && (
        <View style={styles.reasonCard}>
          <Text style={styles.reasonLabel}>{t('approval.reason')}</Text>
          <Text style={styles.reasonText}>{reason.trim()}</Text>
        </View>
      )}
      <View style={styles.infoCard}>
        <Feather name="info" size={16} color="#6B7280" style={{ marginTop: 2 }} />
        <Text style={styles.infoText}>{t('approval.cancelledInfo')}</Text>
      </View>

      <View style={styles.history}>
        <Text style={styles.historyTitle}>{t('approval.cancelledHistory')}</Text>
        {payments.isLoading ? null : rows.length === 0 ? (
          <Text style={styles.empty}>{t('approval.cancelledNoHistory')}</Text>
        ) : (
          rows.map((p) => (
            <View key={p.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{p.transactionType}</Text>
                <Text style={styles.rowSub}>{[p.receiptNo, fmtDate(p.transactionDate), p.paymentMethod].filter(Boolean).join(' · ')}</Text>
              </View>
              <Text style={styles.rowAmount}><CurrencyValue amount={Number(p.paidAmount ?? p.amount ?? 0)} /></Text>
            </View>
          ))
        )}
      </View>

      <Button
        title={t('approval.openCommunity')}
        onPress={() => router.push('/(member)/community' as any)}
        style={styles.button}
      />
      <Button
        title={t('approval.browseGyms')}
        variant="outline"
        onPress={() => router.push('/(member)/centers' as any)}
        style={styles.secondaryButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.five,
    gap: Spacing.three,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(220,38,38,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  title: { fontSize: 20, fontWeight: '800', color: '#111827', textAlign: 'center' },
  subtitle: { fontSize: TypographyScale.body, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  reasonCard: {
    alignSelf: 'stretch',
    backgroundColor: '#FEF2F2',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: Spacing.three,
    marginTop: Spacing.two,
    gap: 4,
  },
  reasonLabel: { fontSize: 12, fontWeight: '700', color: '#B91C1C', textTransform: 'uppercase', letterSpacing: 0.5 },
  reasonText: { fontSize: 14, color: '#7F1D1D', lineHeight: 20 },
  infoCard: {
    flexDirection: 'row',
    gap: Spacing.two,
    backgroundColor: '#F9FAFB',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: Spacing.three,
  },
  infoText: { flex: 1, fontSize: 13, color: '#4B5563', lineHeight: 18 },
  history: {
    alignSelf: 'stretch',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  historyTitle: { fontSize: 12, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  empty: { fontSize: 13, color: '#9CA3AF' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: 4 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  rowSub: { fontSize: 12, color: '#6B7280' },
  rowAmount: { fontSize: 14, fontWeight: '700', color: '#111827' },
  button: { alignSelf: 'stretch', marginTop: Spacing.two },
  secondaryButton: { alignSelf: 'stretch' },
});
