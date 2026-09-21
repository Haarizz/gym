import React from 'react';
import { View, Text, ScrollView, Pressable, Alert, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { AppBottomSheet } from '../AppBottomSheet';
import { Loader } from '../Loader';
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
          Alert.alert('Sharing Unavailable', 'Cannot share PDF on this device.');
        }
      }
    } catch (error) {
      console.error('Download failed:', error);
      Alert.alert('Error', 'Failed to generate receipt PDF.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr));
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loaderContainer}>
          <Loader message="Loading receipt details..." />
        </View>
      );
    }

    if (isError || !receipt) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load receipt data.</Text>
        </View>
      );
    }

    const isPaid = receipt.status.toLowerCase() === 'paid';
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
              <Text style={[styles.statusText, { color: statusColor }]}>{receipt.status}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Billed To</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Member Name</Text>
              <Text style={styles.rowValue}>{receipt.memberName || '-'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Member ID</Text>
              <Text style={styles.rowValue}>{receipt.memberId || '-'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Phone</Text>
              <Text style={styles.rowValue}>{receipt.memberPhone || '-'}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transaction Info</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Type</Text>
              <Text style={styles.rowValue}>{receipt.transactionType || '-'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Payment Method</Text>
              <Text style={styles.rowValue}>{receipt.paymentMethod || '-'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Plan / Service</Text>
              <Text style={styles.rowValue}>{receipt.planName || '-'}</Text>
            </View>
            {receipt.validFrom && receipt.validTill && (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Validity</Text>
                <Text style={styles.rowValue}>
                  {formatDate(receipt.validFrom)} - {formatDate(receipt.validTill)}
                </Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Processed By</Text>
              <Text style={styles.rowValue}>{receipt.processedBy || '-'}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Summary</Text>
            <View style={styles.totalsContainer}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalValue}>{formatCurrency(receipt.amount)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: '#16a34a' }]}>Amount Paid</Text>
                <Text style={[styles.totalValue, { color: '#16a34a' }]}>
                  {formatCurrency(receipt.paidAmount)}
                </Text>
              </View>
              <View style={[styles.totalRow, { marginTop: Spacing.two }]}>
                <Text style={styles.grandTotalLabel}>Balance Due</Text>
                <Text
                  style={[
                    styles.grandTotalValue,
                    { color: receipt.dueAmount > 0 ? BrandColors.danger : '#16a34a' },
                  ]}
                >
                  {formatCurrency(receipt.dueAmount)}
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
            <MaterialCommunityIcons name="download" size={20} color="white" />
            <Text style={styles.downloadButtonText}>Download Receipt</Text>
          </Pressable>
        </View>
      </>
    );
  };

  return (
    <AppBottomSheet visible={visible} onClose={onClose} title="Receipt Details" subtitle="Transaction record">
      {renderContent()}
    </AppBottomSheet>
  );
}
