import { useTranslation } from 'react-i18next';
import { getIntlLocale, tOr } from '@/core/i18n';
import React from 'react';
import { View, ScrollView, Pressable, Alert, Platform } from 'react-native';
import { Text } from '@/shared/components/AppText';
import Feather from '@expo/vector-icons/Feather';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { AppBottomSheet } from '../AppBottomSheet';
import { Loader } from '../Loader';
import { CurrencyValue } from '@/core/providers';
import { BrandColors, Spacing } from '@/core/theme';
import { buildReceiptInvoiceHtml } from '../../utils/buildReceiptInvoiceHtml';
import { useMemberReceipt } from '@/domains/memberPortal/membership/hooks/useMemberReceipt';

import { styles } from './ReceiptBottomSheet.styles';
import type { ReceiptBottomSheetProps } from './ReceiptBottomSheet.types';

export function ReceiptBottomSheet({
  visible,
  onClose,
  receiptId,
  accentColor = BrandColors.teal,
}: ReceiptBottomSheetProps) {
  const { t } = useTranslation();
  const { data: receipt, isLoading, isError } = useMemberReceipt(receiptId);

  const handleDownload = async () => {
    if (!receipt) return;
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
    const statusColor = isPaid ? '#16a34a' : '#d97706';

    return (
      <>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.headerBanner, { borderTopColor: accentColor, borderTopWidth: 4 }]}>
            <View>
              <Text style={styles.receiptNo}>{receipt.receiptNo}</Text>
              <Text style={styles.rowLabel}>{formatDate(receipt.transactionDate)}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: `${statusColor}15` }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{tOr(`membership.payments.statusValues.${receipt.status}`, receipt.status)}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('shared.receipt.billedTo')}</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('shared.receipt.memberName')}</Text>
              <Text style={styles.rowValue}>{receipt.memberName || '-'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('shared.receipt.memberId')}</Text>
              <Text style={styles.rowValue}>{receipt.memberId || '-'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('shared.receipt.phone')}</Text>
              <Text style={styles.rowValue}>{receipt.memberPhone || '-'}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('shared.receipt.transactionInfo')}</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('shared.receipt.type')}</Text>
              <Text style={styles.rowValue}>{receipt.transactionType || '-'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('shared.receipt.paymentMethod')}</Text>
              <Text style={styles.rowValue}>{receipt.paymentMethod || '-'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('shared.receipt.subscription')}</Text>
              <Text style={styles.rowValue}>{receipt.planName || '-'}</Text>
            </View>
            {receipt.validFrom && receipt.validTill && (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>{t('shared.receipt.validity')}</Text>
                <Text style={styles.rowValue}>
                  {formatDate(receipt.validFrom)} - {formatDate(receipt.validTill)}
                </Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('shared.receipt.processedBy')}</Text>
              <Text style={styles.rowValue}>{receipt.processedBy || '-'}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('shared.receipt.paymentSummary')}</Text>
            <View style={styles.totalsContainer}>
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
                <Text style={[styles.totalLabel, { color: '#16a34a' }]}>{t('shared.receipt.amountPaid')}</Text>
                <Text style={[styles.totalValue, { color: '#16a34a' }]}>
                  <CurrencyValue amount={receipt.paidAmount} decimals={2} />
                </Text>
              </View>
              <View style={[styles.totalRow, { marginTop: Spacing.two }]}>
                <Text style={styles.grandTotalLabel}>{t('shared.receipt.balanceDue')}</Text>
                <Text
                  style={[
                    styles.grandTotalValue,
                    { color: receipt.dueAmount > 0 ? BrandColors.danger : '#16a34a' },
                  ]}
                >
                  <CurrencyValue amount={receipt.dueAmount} decimals={2} />
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.actionBar}>
          <Pressable
            style={[styles.downloadButton, { backgroundColor: accentColor }]}
            onPress={handleDownload}
          >
            <Feather name="download" size={20} color="white" />
            <Text style={styles.downloadButtonText}>{t('shared.receipt.download')}</Text>
          </Pressable>
        </View>
      </>
    );
  };

  return (
    <AppBottomSheet visible={visible} onClose={onClose} title={t('shared.receipt.title')} subtitle={t('shared.receipt.subtitle')}>
      {renderContent()}
    </AppBottomSheet>
  );
}
