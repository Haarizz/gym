import React, { useCallback, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { AppHeader } from '@/shared/components/AppHeader';
import { Divider } from '@/shared/components/Surface';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { Typography } from '@/shared/components/Typography';

import { useReceipt } from '../../hooks/useBills';
import {
  BillingSection,
  BillingSkeleton,
  ErrorState,
  MoneyText,
  OutstandingBalanceCard,
  PaymentMethodBadge,
  PaymentStatusBadge,
  PaymentSummaryCard,
  ReceiptActionBar,
} from '../components';

import { toast } from '@/shared/components/Toasts/toastStore';

interface ReceiptDetailsScreenProps {
  receiptId: number;
  onBack: () => void;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.infoRow}>
      <Typography variant="caption" color="textSecondary" style={styles.infoLabel}>
        {label}
      </Typography>
      <Typography variant="bodySmall" style={styles.infoValue}>
        {value ?? '—'}
      </Typography>
    </View>
  );
}

/**
 * Receipt Details Screen.
 *
 * Displays:
 *  - Receipt information (number, date, type, status)
 *  - Member information
 *  - Payment details (method, breakdown)
 *  - Validity period
 *  - Outstanding balance
 *  - Minor charges (if present)
 *  - Payment breakdown
 *  - Sticky action bar (Download, Share, Email)
 *  - Share Bottom Sheet (Email, SMS, WhatsApp, Print)
 */
export function ReceiptDetailsScreen({ receiptId, onBack }: ReceiptDetailsScreenProps) {
  const { receipt, loading, error, refresh } = useReceipt(receiptId);
  const [shareSheetVisible, setShareSheetVisible] = useState(false);

  const handleDownload = useCallback(() => {
    toast.info(
      `Receipt ${receipt?.receiptNo ?? `#${receiptId}`} has been saved to your downloads.`,
      {
        title: 'Download Receipt'
      }
    );
  }, [receipt?.receiptNo, receiptId]);

  const handleOpenShare = useCallback(() => {
    setShareSheetVisible(true);
  }, []);

  const handleShareChannel = useCallback((channel: string) => {
    setShareSheetVisible(false);
    setTimeout(() => {
      toast.info(
        `Receipt ${receipt?.receiptNo ?? `#${receiptId}`} sent via ${channel} to ${receipt?.memberName ?? 'Member'}.`
      );
    }, 200);
  }, [receipt?.receiptNo, receipt?.memberName, receiptId]);

  if (loading && !receipt) {
    return (
      <ScreenLayout>
        <AppHeader
          title="Receipt Details"
          subtitle="Transaction Record"
          colors={['#327f74', '#2a6b62']}
          onBack={onBack}
        />
        <BillingSkeleton variant="detail" count={4} />
      </ScreenLayout>
    );
  }

  if (error && !receipt) {
    return (
      <ScreenLayout>
        <AppHeader
          title="Receipt Details"
          subtitle="Transaction Record"
          colors={['#327f74', '#2a6b62']}
          onBack={onBack}
        />
        <ErrorState message="Failed to load receipt details." onRetry={refresh} />
      </ScreenLayout>
    );
  }

  const breakdownRows = (receipt?.paymentBreakdown ?? []).map((split) => ({
    label: `${split.method}${split.reference ? ` (${split.reference})` : ''}`,
    amount: split.amount,
  }));

  const shareChannels = [
    {
      name: 'Email',
      icon: 'mail' as const,
      color: '#0284c7',
      bg: '#e0f2fe',
      detail: receipt?.memberId ? `Send to member email` : 'Email PDF',
    },
    {
      name: 'SMS',
      icon: 'message-square' as const,
      color: '#16a34a',
      bg: '#dcfce7',
      detail: receipt?.memberPhone ?? 'Send SMS link',
    },
    {
      name: 'WhatsApp',
      icon: 'phone' as const,
      color: '#15803d',
      bg: '#dcfce7',
      detail: receipt?.memberPhone ?? 'Share via WhatsApp',
    },
    {
      name: 'Print',
      icon: 'printer' as const,
      color: '#4b5563',
      bg: '#f3f4f6',
      detail: 'Print tax invoice receipt',
    },
  ];

  return (
    <ScreenLayout>
      <AppHeader
        title={receipt?.receiptNo ?? `Receipt #${receiptId}`}
        subtitle={receipt?.transactionType ?? 'Transaction'}
        colors={['#327f74', '#2a6b62']}
        onBack={onBack}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={BrandColors.teal}
          />
        }
      >
        {/* ── Status + amount hero ─────────────────────────────── */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroAmount}>
              <Typography variant="caption" color="textSecondary">
                Total Amount
              </Typography>
              <MoneyText amount={receipt?.amount} variant="title" color={BrandColors.teal} />
            </View>
            <PaymentStatusBadge status={receipt?.status} />
          </View>
          <View style={styles.heroMeta}>
            <PaymentMethodBadge method={receipt?.paymentMethod} />
            <Typography variant="caption" color="textSecondary">
              {formatDate(receipt?.transactionDate)}
            </Typography>
          </View>
        </View>

        {/* ── Receipt information ──────────────────────────────── */}
        <BillingSection title="Receipt Information">
          <View style={styles.infoCard}>
            <InfoRow label="Receipt Number" value={receipt?.receiptNo} />
            <Divider />
            <InfoRow label="Transaction Date" value={formatDate(receipt?.transactionDate)} />
            <Divider />
            <InfoRow label="Transaction Type" value={receipt?.transactionType} />
            <Divider />
            <InfoRow label="Plan" value={receipt?.planName} />
            <Divider />
            <InfoRow label="Processed By" value={receipt?.processedBy} />
            {receipt?.remarks && (
              <>
                <Divider />
                <InfoRow label="Remarks" value={receipt.remarks} />
              </>
            )}
          </View>
        </BillingSection>

        {/* ── Member information ───────────────────────────────── */}
        <BillingSection title="Member Information">
          <View style={styles.infoCard}>
            <InfoRow label="Name" value={receipt?.memberName} />
            <Divider />
            <InfoRow label="Member ID" value={receipt?.memberId} />
            <Divider />
            <InfoRow label="Phone" value={receipt?.memberPhone} />
            <Divider />
            <InfoRow label="Membership Type" value={receipt?.membershipType} />
          </View>
        </BillingSection>

        {/* ── Payment details ──────────────────────────────────── */}
        <BillingSection title="Payment Details">
          <View style={styles.infoCard}>
            <InfoRow label="Payment Method" value={receipt?.paymentMethod} />
            <Divider />
            <InfoRow label="Paid Amount" value={receipt?.paidAmount !== undefined ? `₹${receipt.paidAmount.toLocaleString('en-IN')}` : undefined} />
            <Divider />
            <InfoRow label="Due Amount" value={receipt?.dueAmount !== undefined ? `₹${receipt.dueAmount.toLocaleString('en-IN')}` : undefined} />
            {receipt?.bankAccountName && (
              <>
                <Divider />
                <InfoRow label="Bank Account" value={`${receipt.bankAccountName} (${receipt.bankAccountCode ?? ''})`} />
              </>
            )}
          </View>
        </BillingSection>

        {/* ── Validity period ──────────────────────────────────── */}
        {(receipt?.validFrom || receipt?.validTill) && (
          <BillingSection title="Validity Period">
            <View style={styles.infoCard}>
              <InfoRow label="Valid From" value={formatDate(receipt?.validFrom)} />
              <Divider />
              <InfoRow label="Valid Till" value={formatDate(receipt?.validTill)} />
            </View>
          </BillingSection>
        )}

        {/* ── Outstanding balance ──────────────────────────────── */}
        {receipt?.balanceAfter !== undefined && (
          <BillingSection title="Outstanding Balance">
            <OutstandingBalanceCard balance={receipt.balanceAfter} />
          </BillingSection>
        )}

        {/* ── Minor charges ────────────────────────────────────── */}
        {(receipt?.minorCharges ?? []).length > 0 && (
          <BillingSection title="Minor Charges">
            <View style={styles.infoCard}>
              {receipt!.minorCharges!.map((charge, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <Divider />}
                  <View style={styles.minorChargeRow}>
                    <View>
                      <Typography variant="bodySmall" style={{ fontWeight: '600' }}>
                        {charge.name ?? 'Dependent'}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {charge.memberId}
                      </Typography>
                    </View>
                    <View style={styles.minorRight}>
                      <MoneyText amount={charge.amount} variant="bodySmall" />
                      {charge.paid !== undefined && (
                        <PaymentStatusBadge
                          status={charge.paid ? 'Paid' : 'Pending'}
                        />
                      )}
                    </View>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </BillingSection>
        )}

        {/* ── Payment breakdown ────────────────────────────────── */}
        {breakdownRows.length > 0 && (
          <BillingSection title="Payment Breakdown">
            <PaymentSummaryCard
              rows={[
                ...breakdownRows,
                {
                  label: 'Total',
                  amount: receipt?.amount ?? 0,
                  bold: true,
                  color: BrandColors.teal,
                },
              ]}
            />
          </BillingSection>
        )}
      </ScrollView>

      {/* Sticky action bar */}
      <View style={styles.actionBar}>
        <ReceiptActionBar
          onDownload={handleDownload}
          onShare={handleOpenShare}
          onEmail={() => handleShareChannel('Email')}
        />
      </View>

      {/* Share Bottom Sheet Modal */}
      <Modal
        visible={shareSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setShareSheetVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShareSheetVisible(false)} />
          <View style={styles.bottomSheetCard}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHandle} />
              <Typography variant="bodySmallBold" style={styles.sheetTitle}>
                Share Receipt
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Choose a communication channel to send {receipt?.receiptNo ?? `Receipt #${receiptId}`}
              </Typography>
            </View>

            <View style={styles.channelList}>
              {shareChannels.map((item) => (
                <Pressable
                  key={item.name}
                  style={({ pressed }) => [styles.channelItem, pressed && styles.pressed]}
                  onPress={() => handleShareChannel(item.name)}
                >
                  <View style={[styles.channelIconBg, { backgroundColor: item.bg }]}>
                    <Feather name={item.icon} size={18} color={item.color} />
                  </View>
                  <View style={styles.channelInfo}>
                    <Typography variant="bodySmallBold">{item.name}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {item.detail}
                    </Typography>
                  </View>
                  <Feather name="chevron-right" size={16} color={BrandColors.textSecondary} />
                </Pressable>
              ))}
            </View>

            <Pressable
              style={styles.cancelButton}
              onPress={() => setShareSheetVisible(false)}
            >
              <Typography variant="bodySmallBold" style={styles.cancelText}>
                Cancel
              </Typography>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.three,
    gap: Spacing.four,
    paddingBottom: 100, // clear of sticky action bar
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: Spacing.three,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    gap: Spacing.two,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  heroAmount: {
    gap: 2,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: 44,
  },
  infoLabel: {
    flex: 1,
    marginRight: Spacing.two,
  },
  infoValue: {
    flex: 1,
    textAlign: 'right',
    fontWeight: '500',
  },
  minorChargeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  minorRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  actionBar: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    paddingTop: Spacing.two,
    backgroundColor: 'transparent',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  bottomSheetCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.four,
    gap: Spacing.three,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  sheetHeader: {
    alignItems: 'center',
    gap: 4,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: '#d1d5db',
    marginBottom: Spacing.two,
  },
  sheetTitle: {
    fontSize: 16,
  },
  channelList: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  pressed: {
    opacity: 0.8,
  },
  channelIconBg: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelInfo: {
    flex: 1,
    gap: 2,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: '#f3f4f6',
    marginTop: Spacing.one,
  },
  cancelText: {
    color: BrandColors.textPrimary,
  },
});
