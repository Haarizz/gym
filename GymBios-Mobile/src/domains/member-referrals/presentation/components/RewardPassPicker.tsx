import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Trans, useTranslation } from 'react-i18next';
import { Text, TextInput } from '@/shared/components/AppText';
import { formatDate, i18n } from '@/core/i18n';
import Feather from '@expo/vector-icons/Feather';
import { CurrencyValue } from '@/core/providers';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { useMyCoupons, useMyRewardPasses } from '../hooks/useMemberReferrals';
import { rewardDiscount } from '../../infrastructure/discountCodeApi';
import type { DiscountCode, MyReferralReward, PassContext } from '../../domain/types';

/** A picked Reward Pass or an applied coupon code — at most one per purchase. */
export type RewardSelection =
  | { kind: 'pass'; pass: MyReferralReward }
  | { kind: 'coupon'; coupon: DiscountCode }
  | null;

/** Display-only discount on `gross`; the backend recomputes and spends it. */
export function selectionDiscount(sel: RewardSelection, gross: number): number {
  if (!sel) return 0;
  if (sel.kind === 'pass') return rewardDiscount(sel.pass.rewardUnit, sel.pass.rewardValue, gross);
  // Promotions carry caps/minimums/"free" only the server prices — prefer its figure.
  if (sel.coupon.discountAmount != null) return Math.min(sel.coupon.discountAmount, gross);
  return rewardDiscount(sel.coupon.discountType, sel.coupon.discountValue, gross);
}

export function passTitle(p: MyReferralReward): React.ReactNode {
  if (p.rewardType === 'MEMBERSHIP_DISCOUNT' || p.rewardType === 'COUPON') {
    if (p.rewardValue == null) return p.rewardName;
    return p.rewardUnit === 'PERCENT' ? (
      i18n.t('rewardPicker.percentOff', { value: p.rewardValue })
    ) : (
      <Trans i18nKey="rewardPicker.amountOff" components={{ amount: <CurrencyValue amount={p.rewardValue} /> }} />
    );
  }
  return i18n.t('rewardPicker.freeSession');
}

interface Props {
  /**
   * Which passes to offer; null = coupon code only (e.g. a new member has no passes yet).
   * The member's own coupons are listed only when this is set — they belong to their own gym.
   */
  passContext: PassContext | null;
  value: RewardSelection;
  onChange: (sel: RewardSelection) => void;
  /** Resolves a typed code; omit to hide the coupon field. */
  validateCode?: (code: string) => Promise<DiscountCode>;
  /** Also accept promotion codes; otherwise only COUPON results are. */
  acceptPromotions?: boolean;
  /** A code to fill in and apply once on mount, e.g. from the dashboard's offer */
  initialCode?: string;
}

export function RewardPassPicker({ passContext, value, onChange, validateCode, acceptPromotions = false, initialCode }: Props) {
  const { t } = useTranslation();
  const { data: passes = [] } = useMyRewardPasses(passContext);
  const { data: coupons = [] } = useMyCoupons(passContext != null && !!validateCode);
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [checkingCoupon, setCheckingCoupon] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const appliedInitial = useRef<string | null>(null);

  useEffect(() => {
    if (!initialCode || !validateCode || value || appliedInitial.current === initialCode) return;
    appliedInitial.current = initialCode;
    setCode(initialCode.toUpperCase());
    applyCode(initialCode);
    // Once per initialCode; applyCode is recreated each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode, validateCode, value]);

  if (passes.length === 0 && !validateCode) return null;

  async function applyCode(typed: string = code) {
    if (!validateCode || !typed.trim()) return;
    setChecking(true);
    setError(null);
    try {
      const resolved = await validateCode(typed.trim());
      if (resolved.source !== 'COUPON' && !acceptPromotions) {
        setError(t('rewardPicker.promotionNotAllowed'));
        return;
      }
      onChange({ kind: 'coupon', coupon: resolved });
    } catch (err: any) {
      setError(err?.message || t('rewardPicker.invalidCode'));
    } finally {
      setChecking(false);
    }
  };

  // Goes through validateCode like a typed code, so the server prices it on this purchase.
  const applyMyCoupon = async (couponCode: string) => {
    if (!validateCode) return;
    setCheckingCoupon(couponCode);
    setError(null);
    try {
      onChange({ kind: 'coupon', coupon: await validateCode(couponCode) });
    } catch (err: any) {
      setError(err?.message || t('rewardPicker.invalidCode'));
    } finally {
      setCheckingCoupon(null);
    }
  };

  return (
    <View style={styles.card}>
      {passes.length > 0 && (
        <>
          <Text style={styles.title}>{t('rewardPicker.passesTitle')}</Text>
          {passes.map((p) => {
            const selected = value?.kind === 'pass' && value.pass.id === p.id;
            return (
              <Pressable
                key={p.id}
                style={[styles.passRow, selected && styles.passRowSelected]}
                onPress={() => {
                  setError(null);
                  onChange(selected ? null : { kind: 'pass', pass: p });
                }}
              >
                <Feather name={selected ? 'check-circle' : 'circle'} size={18}
                  color={selected ? BrandColors.memberGold : BrandColors.textSecondary} />
                <View style={styles.passText}>
                  <Text style={styles.passTitle}>{passTitle(p)}</Text>
                  <Text style={styles.passMeta}>
                    {p.rewardCode ?? p.rewardName}{p.expiryDate ? ` · ${t('rewardPicker.until', { date: formatDate(p.expiryDate, 'PP') })}` : ''}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </>
      )}

      {coupons.length > 0 && (
        <>
          <Text style={[styles.title, passes.length > 0 && styles.spaced]}>{t('rewardPicker.myCouponsTitle')}</Text>
          {coupons.map((c) => {
            const selected = value?.kind === 'coupon' && value.coupon.code === c.couponCode;
            return (
              <Pressable
                key={c.id}
                style={[styles.passRow, selected && styles.passRowSelected]}
                disabled={checkingCoupon != null}
                onPress={() => {
                  if (selected) {
                    setError(null);
                    onChange(null);
                  } else {
                    applyMyCoupon(c.couponCode!);
                  }
                }}
              >
                {checkingCoupon === c.couponCode ? (
                  <ActivityIndicator size="small" color={BrandColors.memberGold} />
                ) : (
                  <Feather name={selected ? 'check-circle' : 'circle'} size={18}
                    color={selected ? BrandColors.memberGold : BrandColors.textSecondary} />
                )}
                <View style={styles.passText}>
                  <Text style={styles.passTitle}>{passTitle(c)}</Text>
                  <Text style={styles.passMeta}>
                    {c.couponCode}{c.expiryDate ? ` · ${t('rewardPicker.until', { date: formatDate(c.expiryDate, 'PP') })}` : ''}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </>
      )}

      {validateCode && (
        <>
          <Text style={[styles.title, (passes.length > 0 || coupons.length > 0) && styles.spaced]}>
            {t(acceptPromotions ? 'rewardPicker.promoOrCoupon' : 'rewardPicker.couponCode')}
          </Text>
          {value?.kind === 'coupon' ? (
            <View style={styles.appliedRow}>
              <Text style={styles.appliedText}>{t('rewardPicker.applied', { code: value.coupon.code })}</Text>
              <Pressable hitSlop={8} onPress={() => { onChange(null); setCode(''); }}>
                <Text style={styles.link}>{t('rewardPicker.remove')}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.codeRow}>
              <TextInput
                style={styles.input}
                placeholder={t(acceptPromotions ? 'rewardPicker.promoPlaceholder' : 'rewardPicker.couponPlaceholder')}
                autoCapitalize="characters"
                value={code}
                editable={value?.kind !== 'pass'}
                onChangeText={(text) => setCode(text.toUpperCase())}
              />
              <Pressable
                style={[styles.applyButton, (checking || !code.trim() || value?.kind === 'pass') && styles.disabled]}
                disabled={checking || !code.trim() || value?.kind === 'pass'}
                onPress={() => applyCode()}
              >
                {checking ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.applyText}>{t('rewardPicker.apply')}</Text>}
              </Pressable>
            </View>
          )}
          {value?.kind === 'pass' && (
            <Text style={styles.hint}>{t('rewardPicker.oneDiscountHint')}</Text>
          )}
        </>
      )}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.screenBackground,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: Spacing.four,
    gap: Spacing.two,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  spaced: {
    marginTop: Spacing.two,
  },
  passRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: BrandColors.surface,
  },
  passRowSelected: {
    borderColor: BrandColors.memberGold,
  },
  passText: {
    flex: 1,
  },
  passTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  passMeta: {
    fontSize: 12,
    color: BrandColors.textSecondary,
    marginTop: 2,
  },
  codeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: BrandColors.surface,
    color: BrandColors.textPrimary,
  },
  applyButton: {
    backgroundColor: BrandColors.memberGold,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.four,
    justifyContent: 'center',
  },
  applyText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
  appliedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  appliedText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#15803D',
  },
  link: {
    color: BrandColors.memberGold,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: BrandColors.textSecondary,
  },
  error: {
    fontSize: 12,
    color: '#DC2626',
  },
});
