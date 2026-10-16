import { useTranslation } from 'react-i18next';
import { formatDate, tOr } from '@/core/i18n';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';

import { CurrencyValue } from '@/core/providers';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { Loader } from '@/shared/components/Loader';
import { EmptyState } from '@/shared/components/EmptyState';
import { GlassBlob, GlassHeader, GlassSurface } from '@/shared/components';

import { useMemberTenantAccess } from '@/domains/discovery/hooks/useMembershipApprovalStatus';
import { useMyWallet } from './useMyWallet';
import type { WalletTransaction } from './walletApi';

interface WalletScreenProps {
  onBack: () => void;
}

function formatWhen(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return formatDate(d, 'PP');
}

/** The member's wallet: balance (refunds and rewards) and its history. */
export function WalletScreen({ onBack }: WalletScreenProps) {
  const { t } = useTranslation();
  // 403'd while a purchase awaits approval (or was rejected) — show the empty wallet instead.
  const hasTenantAccess = useMemberTenantAccess();
  const { data: wallet, isLoading, refetch, isRefetching } = useMyWallet(hasTenantAccess);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <GlassBlob color={BrandColors.memberGold} size={320} opacity={0.34} top={-40} right={-70} />
      <GlassBlob color={BrandColors.teal} size={280} opacity={0.26} top={380} left={-80} />
      <GlassHeader title={t('wallet.title')} subtitle={t('wallet.subtitle')} onBack={onBack} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={BrandColors.memberGold} />}
      >
        <GlassSurface radius={Radius.lg} style={styles.balanceCard}>
          <View style={styles.balanceIcon}>
            <Feather name="credit-card" size={20} color="#16a34a" />
          </View>
          <Typography variant="caption" color="textSecondary">{t('wallet.availableBalance')}</Typography>
          <Typography variant="title" style={styles.balanceValue}>
            <CurrencyValue amount={wallet?.balance ?? 0} decimals={2} />
          </Typography>
          <Typography variant="caption" color="textSecondary" style={styles.balanceHint}>
            {t('wallet.balanceHint')}
          </Typography>
        </GlassSurface>

        <Typography variant="subtitle" style={styles.listHeader}>{t('wallet.history')}</Typography>

        {isLoading ? (
          <Loader />
        ) : !wallet || wallet.transactions.length === 0 ? (
          <EmptyState title={t('wallet.emptyTitle')} description={t('wallet.emptyDescription')} />
        ) : (
          <GlassSurface radius={Radius.lg} style={styles.listCard}>
            {wallet.transactions.map((tx, index) => (
              <WalletRow key={tx.id} tx={tx} divider={index > 0} />
            ))}
          </GlassSurface>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function WalletRow({ tx, divider }: { tx: WalletTransaction; divider: boolean }) {
  const { t } = useTranslation();
  const credit = tx.type === 'CREDIT';
  return (
    <View style={[styles.row, divider && styles.rowDivider]}>
      <View style={[styles.rowIcon, { backgroundColor: credit ? '#DCFCE7' : '#FEE2E2' }]}>
        <Feather name={credit ? 'arrow-down-left' : 'arrow-up-right'} size={16} color={credit ? '#16a34a' : '#dc2626'} />
      </View>
      <View style={styles.rowText}>
        <Typography variant="bodySmallBold" numberOfLines={1}>
          {(tx.sourceType && tOr(`wallet.sources.${tx.sourceType}`, '')) || t(credit ? 'wallet.credit' : 'wallet.spent')}
        </Typography>
        <Typography variant="caption" color="textSecondary" numberOfLines={2}>
          {[formatWhen(tx.createdAt), tx.remarks].filter(Boolean).join(' · ')}
        </Typography>
      </View>
      <Typography variant="bodySmallBold" style={{ color: credit ? '#16a34a' : '#dc2626' }}>
        <CurrencyValue amount={credit ? tx.amount : -tx.amount} signed decimals={2} />
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: Spacing.six,
  },
  balanceCard: {
    padding: Spacing.four,
    alignItems: 'center',
    gap: 2,
    marginBottom: Spacing.four,
  },
  balanceIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  balanceHint: {
    textAlign: 'center',
    marginTop: Spacing.one,
  },
  listHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    marginBottom: Spacing.two,
  },
  listCard: {
    padding: Spacing.four,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
});
