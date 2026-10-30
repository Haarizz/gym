import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, View } from 'react-native';
import { Trans, useTranslation } from 'react-i18next';
import Feather from '@expo/vector-icons/Feather';
import { Text, TextInput } from '@/shared/components/AppText';

import { CurrencyValue } from '@/core/providers';
import { BrandColors, heroTint, Radius, Spacing, TypographyScale } from '@/core/theme';
import { AppBottomSheet, Button } from '@/shared/components';
import type { DiscountCode } from '@/domains/member-referrals/domain/types';
import { useMyWallet } from '../../../wallet/useMyWallet';
import { membershipApi } from '../../infrastructure/membership.api';
import type { AddOn, AddOnCheckout } from '../../domain/models';

const round2 = (n: number) => Math.round(n * 100) / 100;

// memberGold is too light for text on white; this keeps the gold accent readable.
const GOLD_TEXT = '#A16207';
const SUCCESS = '#15803D';

export interface AddOnDetailsBottomSheetProps {
  visible: boolean;
  addOn: AddOn | null;
  isProcessing?: boolean;
  onClose: () => void;
  /** With what the member agreed to pay — the payment sheet collects `toPay`, if any. */
  onContinue: (checkout: AddOnCheckout) => void;
}

// Details + review (promotion code, wallet) before the shared PaymentBottomSheet.
// The parent remounts it per add-on (key), so the code and wallet choice start fresh.
export function AddOnDetailsBottomSheet({
  visible,
  addOn,
  isProcessing = false,
  onClose,
  onContinue,
}: AddOnDetailsBottomSheetProps) {
  const { t } = useTranslation();
  // Only promotion codes scoped to add-ons — the server refuses referral coupons here.
  const [code, setCode] = useState('');
  const [applied, setApplied] = useState<DiscountCode | null>(null);
  const [checking, setChecking] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [useWallet, setUseWallet] = useState(false);
  const { data: wallet } = useMyWallet(visible);

  if (!addOn) {
    return null;
  }

  // ── Pricing (display only — the server re-prices and refuses a mismatch) ──
  const price = addOn.price ?? 0;
  const isPriced = price > 0;
  const discount = applied ? round2(Math.min(applied.discountAmount ?? 0, price)) : 0;
  const net = round2(Math.max(0, price - discount));
  const walletBalance = wallet?.balance ?? 0;
  const walletApplied = useWallet ? round2(Math.min(walletBalance, net)) : 0;
  const toPay = round2(net - walletApplied);

  const applyCode = async () => {
    const typed = code.trim();
    if (!typed) return;
    setChecking(true);
    setCodeError(null);
    try {
      setApplied(await membershipApi.validateAddOnCode(addOn.id, typed));
    } catch (err: any) {
      setCodeError(err?.message || t('rewardPicker.invalidCode'));
    } finally {
      setChecking(false);
    }
  };

  const removeCode = () => {
    setApplied(null);
    setCode('');
    setCodeError(null);
  };

  const continueToPay = () =>
    onContinue({
      addOn,
      couponCode: applied?.code ?? undefined,
      net,
      walletApplied,
      toPay,
    });

  const footer = (
    <View style={styles.footerContent}>
      <Button
        title={
          toPay > 0 ? (
            <Trans
              i18nKey="membership.addons.continueToPayment"
              components={{ amount: <CurrencyValue amount={toPay} /> }}
            />
          ) : (
            t('membership.addons.confirmPurchase')
          )
        }
        onPress={continueToPay}
        loading={isProcessing}
        size="lg"
        style={styles.buyButton}
      />
      {toPay > 0 && (
        <View style={styles.noteRow}>
          <Feather name="info" size={12} color={BrandColors.textSecondary} />
          <Text style={styles.noteText}>{t('membership.addons.approvalNote')}</Text>
        </View>
      )}
    </View>
  );

  return (
    <AppBottomSheet
      visible={visible}
      title={t('membership.addons.detailsTitle')}
      onClose={onClose}
      footer={footer}
    >
      <View style={styles.container}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <Feather name="zap" size={22} color={GOLD_TEXT} />
            </View>
            <View style={styles.validityPill}>
              <Feather name="clock" size={12} color={BrandColors.teal} />
              <Text style={styles.validityText}>{addOn.pricingUnit}</Text>
            </View>
          </View>
          <Text style={styles.title}>{addOn.name}</Text>
          <View style={styles.heroPriceRow}>
            {isPriced ? (
              <CurrencyValue style={styles.heroPrice} amount={price} />
            ) : (
              <Text style={styles.heroPrice}>{t('membership.addons.free')}</Text>
            )}
          </View>
          {!!addOn.description && (
            <Text style={styles.descriptionText}>{addOn.description}</Text>
          )}
        </View>

        {isPriced && (
          <>
            {/* Promotion code */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('membership.addons.promoTitle')}</Text>
              {applied ? (
                <View style={styles.appliedRow}>
                  <View style={styles.appliedIcon}>
                    <Feather name="check" size={14} color="#FFFFFF" />
                  </View>
                  <View style={styles.appliedText}>
                    <Text style={styles.appliedCode}>{applied.code}</Text>
                    <Text style={styles.appliedSaving}>
                      <Trans
                        i18nKey="membership.addons.youSave"
                        components={{ amount: <CurrencyValue amount={discount} /> }}
                      />
                    </Text>
                  </View>
                  <Pressable hitSlop={10} onPress={removeCode} accessibilityRole="button">
                    <Text style={styles.removeText}>{t('rewardPicker.remove')}</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={[styles.codeField, !!codeError && styles.codeFieldError]}>
                  <Feather name="tag" size={16} color={BrandColors.textSecondary} />
                  <TextInput
                    style={styles.codeInput}
                    placeholder={t('membership.addons.promoPlaceholder')}
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    value={code}
                    onChangeText={(text) => {
                      setCode(text.toUpperCase());
                      setCodeError(null);
                    }}
                    onSubmitEditing={applyCode}
                    returnKeyType="done"
                  />
                  <Pressable
                    style={[styles.applyButton, (!code.trim() || checking) && styles.applyButtonDisabled]}
                    disabled={!code.trim() || checking}
                    onPress={applyCode}
                    accessibilityRole="button"
                  >
                    {checking ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.applyText}>{t('rewardPicker.apply')}</Text>
                    )}
                  </Pressable>
                </View>
              )}
              {!!codeError && <Text style={styles.errorText}>{codeError}</Text>}
            </View>

            {/* Wallet */}
            {walletBalance > 0 && net > 0 && (
              <Pressable
                style={[styles.walletCard, useWallet && styles.walletCardOn]}
                onPress={() => setUseWallet((v) => !v)}
                accessibilityRole="switch"
                accessibilityState={{ checked: useWallet }}
              >
                <View style={styles.walletIcon}>
                  <Feather name="credit-card" size={18} color={BrandColors.teal} />
                </View>
                <View style={styles.walletText}>
                  <Text style={styles.walletTitle}>{t('membership.addons.useWallet')}</Text>
                  <Text style={styles.walletHint}>
                    <Trans
                      i18nKey="membership.addons.walletAvailable"
                      components={{ amount: <CurrencyValue amount={walletBalance} /> }}
                    />
                  </Text>
                </View>
                <Switch
                  value={useWallet}
                  onValueChange={setUseWallet}
                  trackColor={{ true: BrandColors.teal, false: '#CBD5E1' }}
                  thumbColor="#FFFFFF"
                />
              </Pressable>
            )}

            {/* Summary */}
            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t('membership.addons.price')}</Text>
                <CurrencyValue style={styles.summaryValue} amount={price} />
              </View>
              {discount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel} numberOfLines={1}>
                    {applied?.name || t('membership.addons.promotion')}
                  </Text>
                  <CurrencyValue style={styles.savingValue} amount={-discount} />
                </View>
              )}
              {walletApplied > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('membership.addons.fromWallet')}</Text>
                  <CurrencyValue style={styles.savingValue} amount={-walletApplied} />
                </View>
              )}
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>{t('membership.addons.totalToPay')}</Text>
                <CurrencyValue style={styles.totalValue} amount={toPay} />
              </View>
            </View>
          </>
        )}
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.four,
    gap: Spacing.four,
  },

  // Hero
  hero: {
    borderRadius: Radius.xl,
    padding: Spacing.four,
    gap: Spacing.two,
    backgroundColor: heroTint(BrandColors.memberGold, 0.12),
    borderWidth: 1,
    borderColor: heroTint(BrandColors.memberGold, 0.35),
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: heroTint(BrandColors.memberGold, 0.3),
  },
  validityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: BrandColors.surface,
  },
  validityText: {
    fontSize: TypographyScale.small,
    fontWeight: '700',
    color: BrandColors.teal,
    textTransform: 'capitalize',
  },
  title: {
    fontSize: TypographyScale.title,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  heroPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  heroPrice: {
    fontSize: 26,
    fontWeight: '800',
    color: GOLD_TEXT,
  },
  descriptionText: {
    fontSize: TypographyScale.body,
    color: BrandColors.textSecondary,
    lineHeight: 21,
    marginTop: Spacing.one,
  },

  // Promotion code
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: TypographyScale.body,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  codeField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingStart: Spacing.three,
    padding: 4,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: BrandColors.surface,
  },
  codeFieldError: {
    borderColor: '#FCA5A5',
  },
  codeInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: Spacing.two,
    fontSize: TypographyScale.body,
    fontWeight: '600',
    letterSpacing: 1,
    color: BrandColors.textPrimary,
  },
  applyButton: {
    flexShrink: 0,
    minWidth: 72,
    height: 38,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.teal,
  },
  applyButtonDisabled: {
    opacity: 0.4,
  },
  applyText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: TypographyScale.body,
  },
  errorText: {
    fontSize: TypographyScale.small,
    color: '#DC2626',
  },
  appliedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  appliedIcon: {
    width: 26,
    height: 26,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SUCCESS,
  },
  appliedText: {
    flex: 1,
    minWidth: 0,
  },
  appliedCode: {
    fontSize: TypographyScale.body,
    fontWeight: '800',
    letterSpacing: 1,
    color: SUCCESS,
  },
  appliedSaving: {
    fontSize: TypographyScale.small,
    color: SUCCESS,
    marginTop: 1,
  },
  removeText: {
    fontSize: TypographyScale.small,
    fontWeight: '700',
    color: BrandColors.textSecondary,
  },

  // Wallet
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: BrandColors.surface,
  },
  walletCardOn: {
    borderColor: BrandColors.teal,
    backgroundColor: BrandColors.screenBackgroundAlt,
  },
  walletIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.screenBackgroundAlt,
  },
  walletText: {
    flex: 1,
    minWidth: 0,
  },
  walletTitle: {
    fontSize: TypographyScale.body,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  walletHint: {
    fontSize: TypographyScale.small,
    color: BrandColors.textSecondary,
    marginTop: 2,
  },

  // Summary
  summary: {
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Radius.lg,
    backgroundColor: BrandColors.screenBackground,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
  },
  summaryLabel: {
    flexShrink: 1,
    fontSize: TypographyScale.body,
    color: BrandColors.textSecondary,
  },
  summaryValue: {
    fontSize: TypographyScale.body,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  savingValue: {
    fontSize: TypographyScale.body,
    fontWeight: '700',
    color: SUCCESS,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: Spacing.one,
  },
  totalLabel: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },

  // Footer
  footerContent: {
    gap: Spacing.two,
  },
  buyButton: {
    width: '100%',
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  noteText: {
    fontSize: TypographyScale.caption + 1,
    color: BrandColors.textSecondary,
    textAlign: 'center',
    flexShrink: 1,
  },
});
