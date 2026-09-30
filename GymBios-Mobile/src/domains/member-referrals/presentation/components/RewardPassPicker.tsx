import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { CurrencyValue } from '@/core/providers';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { useMyRewardPasses } from '../hooks/useMemberReferrals';
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
  if (p.rewardType === 'MEMBERSHIP_DISCOUNT') {
    return p.rewardUnit === 'PERCENT' ? `${p.rewardValue}% off` : <CurrencyValue amount={p.rewardValue} suffix=" off" />;
  }
  return 'Free session';
}

interface Props {
  /** Which passes to offer; null = coupon code only (e.g. a new member has no passes yet). */
  passContext: PassContext | null;
  value: RewardSelection;
  onChange: (sel: RewardSelection) => void;
  /** Resolves a typed code; omit to hide the coupon field. */
  validateCode?: (code: string) => Promise<DiscountCode>;
  /** Also accept promotion codes (new-member purchases); otherwise only COUPON results are. */
  acceptPromotions?: boolean;
}

export function RewardPassPicker({ passContext, value, onChange, validateCode, acceptPromotions = false }: Props) {
  const { data: passes = [] } = useMyRewardPasses(passContext);
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (passes.length === 0 && !validateCode) return null;

  const applyCode = async () => {
    if (!validateCode || !code.trim()) return;
    setChecking(true);
    setError(null);
    try {
      const resolved = await validateCode(code.trim());
      if (resolved.source !== 'COUPON' && !acceptPromotions) {
        setError("That's a promotion code — it can't be used here");
        return;
      }
      onChange({ kind: 'coupon', coupon: resolved });
    } catch (err: any) {
      setError(err?.message || 'Invalid code');
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={styles.card}>
      {passes.length > 0 && (
        <>
          <Text style={styles.title}>Reward Passes</Text>
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
                    {p.rewardCode ?? p.rewardName}{p.expiryDate ? ` · until ${p.expiryDate}` : ''}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </>
      )}

      {validateCode && (
        <>
          <Text style={[styles.title, passes.length > 0 && styles.spaced]}>
            {acceptPromotions ? 'Promo or Coupon Code' : 'Coupon Code'}
          </Text>
          {value?.kind === 'coupon' ? (
            <View style={styles.appliedRow}>
              <Text style={styles.appliedText}>{value.coupon.code} applied</Text>
              <Pressable hitSlop={8} onPress={() => { onChange(null); setCode(''); }}>
                <Text style={styles.link}>Remove</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.codeRow}>
              <TextInput
                style={styles.input}
                placeholder={acceptPromotions ? 'Promotion or referral coupon code' : 'Referral coupon code'}
                autoCapitalize="characters"
                value={code}
                editable={value?.kind !== 'pass'}
                onChangeText={(t) => setCode(t.toUpperCase())}
              />
              <Pressable
                style={[styles.applyButton, (checking || !code.trim() || value?.kind === 'pass') && styles.disabled]}
                disabled={checking || !code.trim() || value?.kind === 'pass'}
                onPress={applyCode}
              >
                {checking ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.applyText}>Apply</Text>}
              </Pressable>
            </View>
          )}
          {value?.kind === 'pass' && (
            <Text style={styles.hint}>A Reward Pass is selected — only one discount can be used.</Text>
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
