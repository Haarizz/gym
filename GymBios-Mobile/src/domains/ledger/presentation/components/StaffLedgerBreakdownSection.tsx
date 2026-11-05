import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/shared/components/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { CurrencyValue, useCurrency } from '@/core/providers';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import type { CommissionStructureItem, EarningsBreakdownItem } from '../../domain/StaffLedgerData';

interface StaffLedgerBreakdownSectionProps {
  breakdown: EarningsBreakdownItem[];
  commissionStructure: CommissionStructureItem[];
}

/** A translator for keys built at runtime (metric codes), typed loosely. */
type Tr = (key: string, options?: Record<string, unknown>) => string;

/** The plan line in the user's language; falls back to the backend's English text. */
function describe(item: CommissionStructureItem, t: Tr, money: (n: number) => string): { label: string; value: string } {
  const k = 'ledger.breakdown.structure';
  if (item.type === 'NONE') return { label: t(`${k}.noPlan`), value: '—' };
  if (!item.metric) return { label: item.label, value: item.value };
  const metric = t(`${k}.metrics.${item.metric}`, { defaultValue: item.label });
  if (item.type === 'TARGET_BONUS' && item.thresholdPct != null && item.rewardValue != null) {
    return {
      label: t(`${k}.bonusLabel`, { threshold: item.thresholdPct, metric: metric.toLowerCase() }),
      value: item.rewardType === 'percent_of_metric_amount'
        ? t(`${k}.bonusPercent`, { rate: item.rewardValue, metric: metric.toLowerCase() })
        : t(`${k}.bonusFixed`, { amount: money(item.rewardValue) }),
    };
  }
  if (item.rate == null) return { label: metric, value: item.value };
  let value = item.basis === 'percent_of_amount'
    ? `${item.rate}%`
    : t(`${k}.perUnit`, { amount: money(item.rate), unit: t(`${k}.units.${item.metric}`, { defaultValue: '' }) });
  if (item.minUnits) value += ` · ${t(`${k}.fromUnits`, { count: item.minUnits })}`;
  if (item.capAmount) value += ` · ${t(`${k}.max`, { amount: money(item.capAmount) })}`;
  return { label: metric, value };
}

export function StaffLedgerBreakdownSection({
  breakdown,
  commissionStructure,
}: StaffLedgerBreakdownSectionProps) {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const tr: Tr = (key, options) => String((t as unknown as (k: string, o?: Record<string, unknown>) => unknown)(key, options));

  return (
    <View style={styles.container}>
      {/* Earnings Breakdown */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('ledger.breakdown.title')}</Text>
        <View style={styles.breakdownList}>
          {breakdown.map((item, idx) => (
            <View key={idx} style={styles.breakdownItem}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemCategory}>{item.category}</Text>
                <Text style={styles.itemAmount}><CurrencyValue amount={item.amount} /></Text>
              </View>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${item.percentage}%`, backgroundColor: BrandColors.teal },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Commission Structure Info */}
      <LinearGradient
        colors={[BrandColors.memberGold, BrandColors.trainerAmber]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.commissionCard}
      >
        <Text style={styles.commissionTitle}>{t('ledger.breakdown.commissionStructureTitle')}</Text>
        <View style={styles.commissionList}>
          {commissionStructure.map((item, idx) => {
            const line = describe(item, tr, formatCurrency);
            return (
              <View key={idx} style={styles.commissionRow}>
                <Text style={styles.commissionLabel}>{line.label}</Text>
                <Text style={styles.commissionAmount}>{line.value}</Text>
              </View>
            );
          })}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: Spacing.three,
  },
  breakdownList: {
    gap: Spacing.three,
  },
  breakdownItem: {},
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  itemCategory: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  itemAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  barTrack: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  commissionCard: {
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  commissionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: Spacing.two,
  },
  commissionList: {
    gap: 8,
  },
  commissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  commissionLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  commissionAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
