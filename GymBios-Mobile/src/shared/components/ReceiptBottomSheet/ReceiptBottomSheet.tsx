import { useTranslation } from 'react-i18next';
import { getIntlLocale, tOr } from '@/core/i18n';
import React, { useState } from 'react';
import { ActivityIndicator, View, Pressable, Alert, Platform } from 'react-native';
import { Text } from '@/shared/components/AppText';
import Feather from '@expo/vector-icons/Feather';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { AppBottomSheet } from '../AppBottomSheet';
import { Loader } from '../Loader';
import { CurrencyValue } from '@/core/providers';
import { BrandColors } from '@/core/theme';
import { buildReceiptInvoiceHtml } from '../../utils/buildReceiptInvoiceHtml';
import { useMemberReceipt } from '@/domains/memberPortal/membership/hooks/useMemberReceipt';

import { styles } from './ReceiptBottomSheet.styles';
import type { ReceiptBottomSheetProps } from './ReceiptBottomSheet.types';

const SUCCESS = '#16a34a';
const WARNING = '#d97706';

export function ReceiptBottomSheet({
  visible,
  onClose,
  receiptId,
  accentColor = BrandColors.teal,
}: ReceiptBottomSheetProps) {
  const { t } = useTranslation();
  const { data: receipt, isLoading, isError } = useMemberReceipt(receiptId);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!receipt || downloading) return;
    setDownloading(true);
    try {
      const html = buildReceiptInvoiceHtml(receipt, accentColor);
      if (Platform.OS === 'web') {
        const win = window.open("", "_blank", "width=820,height=900");
        if (win) {
          win.document.write(html);
          win.document.close();
        }
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: `Receipt_${receipt.receiptNo}.pdf`,
            UTI: 'com.adobe.pdf',
          });
        } else {
          Alert.alert(t('shared.receipt.sharingUnavailableTitle'), t('shared.receipt.sharingUnavailable'));
        }
      }
    } catch (error) {
      console.error('Download failed:', error);
      Alert.alert(t('shared.receipt.errorTitle'), t('shared.receipt.pdfFailed'));
    } finally {
      setDownloading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Intl.DateTimeFormat(getIntlLocale(), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr));
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loaderContainer}>
          <Loader message={t('shared.receipt.loading')} />
        </View>
      );
    }

    if (isError || !receipt) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t('shared.receipt.loadError')}</Text>
        </View>
      );
    }

    const isPaid = receipt.status.toLowerCase() === 'paid';
    const discount = Number(receipt.discountAmount) || 0;
    const hasDue = receipt.dueAmount > 0;
    const statusColor = isPaid ? SUCCESS : WARNING;

    return (
      <View style={styles.content}>
        {/* Summary: what was paid, when, and its status */}
        <View style={[styles.summaryCard, { backgroundColor: `${accentColor}12`, borderColor: `${accentColor}33` }]}>
          <View style={styles.summaryTop}>
            <Text style={styles.receiptNo} numberOfLines={1}>{receipt.receiptNo}</Text>
            <View style={[styles.statusPill, { backgroundColor: `${statusColor}1A` }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {tOr(`membership.payments.statusValues.${receipt.status}`, receipt.status)}
              </Text>
            </View>
          </View>
          <Text style={styles.summaryLabel}>{t('shared.receipt.amountPaid')}</Text>
          <CurrencyValue style={styles.summaryAmount} amount={receipt.paidAmount} decimals={2} />
          <View style={styles.summaryMeta}>
            <Feather name="calendar" size={13} color={BrandColors.textSecondary} />
            <Text style={styles.summaryMetaText}>{formatDate(receipt.transactionDate)}</Text>
          </View>
        </View>

        <Section title={t('shared.receipt.transactionInfo')}>
          <Row label={t('shared.receipt.subscription')} value={receipt.planName} />
          <Row label={t('shared.receipt.type')} value={receipt.transactionType} />
          <Row label={t('shared.receipt.paymentMethod')} value={receipt.paymentMethod} />
          {receipt.validFrom && receipt.validTill ? (
            <Row
              label={t('shared.receipt.validity')}
              value={`${formatDate(receipt.validFrom)} – ${formatDate(receipt.validTill)}`}
            />
          ) : null}
          <Row label={t('shared.receipt.processedBy')} value={receipt.processedBy} last />
        </Section>

        <Section title={t('shared.receipt.billedTo')}>
          <Row label={t('shared.receipt.memberName')} value={receipt.memberName} />
          <Row label={t('shared.receipt.memberId')} value={receipt.memberId} />
          <Row label={t('shared.receipt.phone')} value={receipt.memberPhone} last />
        </Section>

        <Section title={t('shared.receipt.paymentSummary')}>
          {discount > 0 && (
            <>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{t('shared.receipt.price')}</Text>
                <CurrencyValue style={styles.totalValue} amount={Number(receipt.amount) + discount} decimals={2} />
              </View>
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: accentColor, flexShrink: 1 }]}>
                  {receipt.discountLabel || t('shared.receipt.discount')}
                </Text>
                <Text style={[styles.totalValue, { color: accentColor }]}>
                  -<CurrencyValue amount={discount} decimals={2} />
                </Text>
              </View>
            </>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('shared.receipt.totalAmount')}</Text>
            <CurrencyValue style={styles.totalValue} amount={receipt.amount} decimals={2} />
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('shared.receipt.amountPaid')}</Text>
            <Text style={[styles.totalValue, { color: SUCCESS }]}>
              <CurrencyValue amount={receipt.paidAmount} decimals={2} />
            </Text>
          </View>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>{t('shared.receipt.balanceDue')}</Text>
            <Text style={[styles.balanceValue, { color: hasDue ? BrandColors.danger : SUCCESS }]}>
              <CurrencyValue amount={receipt.dueAmount} decimals={2} />
            </Text>
          </View>
        </Section>
      </View>
    );
  };

  const footer = receipt && !isLoading && !isError ? (
    <Pressable
      style={({ pressed }) => [
        styles.downloadButton,
        { backgroundColor: accentColor },
        (pressed || downloading) && styles.downloadButtonPressed,
      ]}
      onPress={handleDownload}
      disabled={downloading}
      accessibilityRole="button"
    >
      {downloading ? (
        <ActivityIndicator size="small" color="white" />
      ) : (
        <Feather name="download" size={18} color="white" />
      )}
      <Text style={styles.downloadButtonText}>{t('shared.receipt.download')}</Text>
    </Pressable>
  ) : undefined;

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      title={t('shared.receipt.title')}
      subtitle={t('shared.receipt.subtitle')}
      footer={footer}
    >
      {renderContent()}
    </AppBottomSheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function Row({ label, value, last }: { label: string; value?: string | null; last?: boolean }) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || '-'}</Text>
    </View>
  );
}
