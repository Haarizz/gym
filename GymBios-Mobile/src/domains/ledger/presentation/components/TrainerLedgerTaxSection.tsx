import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/shared/components/AppText';
import Feather from '@expo/vector-icons/Feather';
import { CurrencyValue, useCurrency } from '@/core/providers';
import { Radius, Spacing } from '@/core/theme';
import type { TrainerTaxDocument, TrainerTaxInformation } from '../../domain/TrainerLedgerData';

interface TrainerLedgerTaxSectionProps {
  taxInfo: TrainerTaxInformation;
  taxDocuments: TrainerTaxDocument[];
  onDocumentPress?: (doc: TrainerTaxDocument) => void;
}

export function TrainerLedgerTaxSection({
  taxInfo,
  taxDocuments,
  onDocumentPress,
}: TrainerLedgerTaxSectionProps) {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();

  return (
    <View style={styles.container}>
      {/* Tax Info Alert Box */}
      <View style={styles.taxAlertCard}>
        <Text style={styles.taxAlertTitle}>{t('ledger.tax.title')}</Text>
        <Text style={styles.taxAlertBody}>
          {t('ledger.tax.ytdEarnings', {
            earnings: taxInfo.ytdEarnings != null ? formatCurrency(taxInfo.ytdEarnings) : '—',
          })}
        </Text>
      </View>

      {/* Year to Date Summary */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('ledger.tax.summaryTitle')}</Text>
        <View style={styles.summaryList}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('ledger.tax.totalEarnings')}</Text>
            <Text style={styles.summaryValue}><MoneyOrDash amount={taxInfo.ytdEarnings} /></Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('ledger.tax.totalSessions')}</Text>
            <Text style={styles.summaryValue}>{taxInfo.totalSessions}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('ledger.tax.avgPerSession')}</Text>
            <Text style={[styles.summaryValue, { color: '#16A34A' }]}>
              <MoneyOrDash amount={taxInfo.avgPerSession} />
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.lastSummaryRow]}>
            <Text style={styles.summaryLabel}>{t('ledger.tax.activeClients')}</Text>
            <Text style={styles.summaryValue}>{taxInfo.activeClients}</Text>
          </View>
        </View>
      </View>

      {/* Tax Documents */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('ledger.tax.documentsTitle')}</Text>
        <View style={styles.docsList}>
          {taxDocuments.length === 0 && (
            <Text style={styles.emptyText}>{t('ledger.tax.noDocumentsEmpty')}</Text>
          )}
          {taxDocuments.map((doc) => (
            <Pressable
              key={doc.id}
              style={styles.docRow}
              onPress={() => onDocumentPress?.(doc)}
              accessibilityRole="button"
              accessibilityLabel={t('ledger.earnings.downloadA11y', { title: doc.title })}
            >
              <Text style={styles.docTitle}>{doc.title}</Text>
              <Feather name="download" size={16} color="#64748B" />
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  taxAlertCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: Radius.md,
    padding: Spacing.four,
  },
  taxAlertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  taxAlertBody: {
    fontSize: 12,
    color: '#1D4ED8',
    marginBottom: 8,
    lineHeight: 16,
  },
  taxAlertLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
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
  summaryList: {},
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  lastSummaryRow: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  docsList: {
    gap: Spacing.two,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.sm,
    padding: Spacing.three,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
  },
  docTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
});

function MoneyOrDash({ amount }: { amount: number | null }) {
  return amount != null ? <CurrencyValue amount={amount} /> : <>—</>;
}
