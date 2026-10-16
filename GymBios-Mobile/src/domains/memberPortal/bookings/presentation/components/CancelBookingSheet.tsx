import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Trans, useTranslation } from 'react-i18next';
import { Text } from '@/shared/components/AppText';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Colors, Radius, Spacing } from '@/core/theme';
import { CurrencyValue } from '@/core/providers';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet/AppBottomSheet';
import type { RefundMethod } from '../../domain/MemberBookingData';
import { formatRefundDeadline, REFUND_CUTOFF_HOURS } from '../../domain/refundPolicy';
import type { BookingItemData } from './BookingCard';

interface CancelBookingSheetProps {
  booking: BookingItemData | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: (booking: BookingItemData, refundMethod: RefundMethod) => void;
}

/**
 * Cancelling a booking: says up front what the member gets back (a wallet refund before
 * the 2-hour cutoff, nothing after it) and lets them pick how a refund is paid.
 */
export function CancelBookingSheet({ booking, loading, onClose, onConfirm }: CancelBookingSheetProps) {
  const { t } = useTranslation();
  // The parent keys this sheet by booking, so each cancellation starts at WALLET.
  const [refundMethod, setRefundMethod] = useState<RefundMethod>('WALLET');

  const paid = booking?.paidAmount ?? 0;
  const partlyPaid = !!booking?.partlyPaid;
  const awaitingApproval = booking?.status === 'pending_approval';
  const hasPass = !!booking?.paidWithPass;
  const refundable = booking?.refundableIfCancelledNow ?? true;
  const deadline = formatRefundDeadline(booking?.refundDeadline);

  return (
    <AppBottomSheet
      visible={!!booking}
      title={t('bookings.cancel.title')}
      subtitle={booking ? booking.class : ''}
      onClose={onClose}
      footer={
        booking ? (
          <View style={styles.actions}>
            <Pressable style={({ pressed }) => [styles.keepButton, pressed && styles.pressed]} onPress={onClose}>
              <Text style={styles.keepText}>{t('bookings.cancel.keep')}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed, loading && styles.disabled]}
              disabled={loading}
              onPress={() => onConfirm(booking, refundMethod)}
            >
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.cancelText}>{t('bookings.cancel.confirm')}</Text>}
            </Pressable>
          </View>
        ) : null
      }
    >
      {booking && (
        <View style={styles.body}>
          {awaitingApproval ? (
            <Notice icon="info" tone="info">
              {t('bookings.cancel.awaitingApproval')}
              {booking.walletAmount ? ` ${t('bookings.cancel.walletReturned')}` : ''}
            </Notice>
          ) : paid <= 0 && !hasPass && !partlyPaid ? (
            <Notice icon="info" tone="info">
              {t('bookings.cancel.free')}
            </Notice>
          ) : refundable ? (
            <>
              <Notice icon="check-circle" tone="success">
                {partlyPaid ? (
                  t('bookings.cancel.refundPartly')
                ) : paid > 0 ? (
                  <Trans
                    i18nKey="bookings.cancel.refundAmount"
                    components={{ b: <Text style={styles.strong} />, amount: <CurrencyValue amount={paid} /> }}
                  />
                ) : (
                  t('bookings.cancel.refundPass')
                )}
                {deadline ? ` ${t('bookings.cancel.beforeDeadline', { deadline })}` : ''}
              </Notice>

              {(paid > 0 || partlyPaid) && (
                <>
                  <Text style={styles.sectionTitle}>{t('bookings.cancel.refundMethodTitle')}</Text>
                  <RefundOption
                    icon="credit-card"
                    title={t('bookings.cancel.walletCredit')}
                    subtitle={t('bookings.cancel.walletCreditSubtitle')}
                    selected={refundMethod === 'WALLET'}
                    onPress={() => setRefundMethod('WALLET')}
                  />
                  <RefundOption
                    icon="corner-up-left"
                    title={t('bookings.cancel.originalMethod')}
                    subtitle={t('bookings.cancel.comingSoon')}
                    selected={false}
                    disabled
                  />
                </>
              )}
            </>
          ) : (
            <Notice icon="alert-triangle" tone="danger">
              <Trans
                i18nKey={
                  partlyPaid
                    ? 'bookings.cancel.noRefundPartly'
                    : paid > 0
                      ? 'bookings.cancel.noRefundPaid'
                      : hasPass
                        ? 'bookings.cancel.noRefundPass'
                        : 'bookings.cancel.noRefund'
                }
                values={{ hours: REFUND_CUTOFF_HOURS }}
                components={{ b: <Text style={styles.strong} />, amount: <CurrencyValue amount={paid} /> }}
              />
            </Notice>
          )}
        </View>
      )}
    </AppBottomSheet>
  );
}

function Notice({
  icon,
  tone,
  children,
}: {
  icon: keyof typeof Feather.glyphMap;
  tone: 'info' | 'success' | 'danger';
  children: React.ReactNode;
}) {
  const palette = {
    info: { bg: '#F1F5F9', border: '#E2E8F0', fg: BrandColors.textSecondary },
    success: { bg: '#ECFDF5', border: '#A7F3D0', fg: BrandColors.teal },
    danger: { bg: '#FEF2F2', border: '#FECACA', fg: Colors.light.error },
  }[tone];
  return (
    <View style={[styles.notice, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Feather name={icon} size={18} color={palette.fg} />
      <Text style={styles.noticeText}>{children}</Text>
    </View>
  );
}

function RefundOption({
  icon,
  title,
  subtitle,
  selected,
  disabled,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  selected: boolean;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      style={[styles.option, selected && styles.optionSelected, disabled && styles.optionDisabled]}
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
    >
      <Feather name={icon} size={18} color={selected ? BrandColors.memberGold : BrandColors.textSecondary} />
      <View style={styles.optionText}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionSubtitle}>{subtitle}</Text>
      </View>
      {disabled ? (
        <View style={styles.soonBadge}>
          <Text style={styles.soonText}>{t('bookings.cancel.soonBadge')}</Text>
        </View>
      ) : (
        <Feather
          name={selected ? 'check-circle' : 'circle'}
          size={18}
          color={selected ? BrandColors.memberGold : BrandColors.textSecondary}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
  notice: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  noticeText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: BrandColors.textPrimary,
  },
  strong: {
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: BrandColors.textPrimary,
    marginTop: Spacing.one,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: BrandColors.surface,
  },
  optionSelected: {
    borderColor: BrandColors.memberGold,
    backgroundColor: '#FEFCE8',
  },
  optionDisabled: {
    opacity: 0.55,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  optionSubtitle: {
    fontSize: 12,
    color: BrandColors.textSecondary,
    marginTop: 2,
  },
  soonBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.full,
    backgroundColor: '#E2E8F0',
  },
  soonText: {
    fontSize: 10,
    fontWeight: '800',
    color: BrandColors.textSecondary,
    letterSpacing: 0.4,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  keepButton: {
    flex: 1,
    paddingVertical: Spacing.three + 2,
    borderRadius: Radius.md,
    alignItems: 'center',
    backgroundColor: BrandColors.screenBackground,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  keepText: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.three + 2,
    borderRadius: Radius.md,
    alignItems: 'center',
    backgroundColor: BrandColors.redDeep,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.6,
  },
});
