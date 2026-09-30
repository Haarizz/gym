import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { toast } from '@/shared/components/Toasts/toastStore';
import { CurrencyValue } from '@/core/providers';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import type { CenterPlan, CenterSummary } from '@/domains/discovery';
import { usePurchaseMembership } from '@/domains/discovery/hooks/usePurchaseMembership';
import { PaymentBottomSheet } from '@/shared/payment/presentation/bottomSheets/PaymentBottomSheet';
import type { PaymentResult } from '@/shared/payment/types';
import {
  RewardPassPicker,
  selectionDiscount,
  type RewardSelection,
} from '@/domains/member-referrals/presentation/components/RewardPassPicker';
import { discountCodeApi } from '@/domains/member-referrals/infrastructure/discountCodeApi';

interface PlanPurchaseModalProps {
  visible: boolean;
  plan: CenterPlan | null;
  center: CenterSummary | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function PlanPurchaseModal({
  visible,
  plan,
  center,
  onClose,
  onSuccess,
}: PlanPurchaseModalProps) {
  const purchaseMutation = usePurchaseMembership();
  // Step 1 offers a promotion or referral coupon code; step 2 is the payment sheet at the net price.
  // 'already-member' is shown when the server rejects the purchase with 409 because
  // this account already has a membership at this gym.
  const [step, setStep] = useState<'offer' | 'pay' | 'already-member'>('offer');
  const [couponSel, setCouponSel] = useState<RewardSelection>(null);

  // Reset on the way out so the next open starts at the coupon step again.
  const close = () => {
    setStep('offer');
    setCouponSel(null);
    onClose();
  };

  if (!plan || !center) return null;

  // Everyone gets the plan's running offer; a code then comes off the offer price.
  const offerDiscount = plan.offerActive ? plan.offerDiscountAmount : 0;
  const offerPrice = offerDiscount > 0 ? plan.effectivePrice : plan.price;
  const couponDiscount = selectionDiscount(couponSel, offerPrice);
  const totalAmount = Math.max(0, offerPrice - couponDiscount);
  const couponCode = couponSel?.kind === 'coupon' ? couponSel.coupon.code : undefined;

  const handlePayNow = (result: PaymentResult) => {
    purchaseMutation.mutate(
      {
        tenantSlug: center.tenantSlug,
        branchId: center.branchId,
        planId: plan.id,
        payment: result,
        couponCode,
      },
      {
        onSuccess: (data: any) => {
          const approvalStatus = data?.approval_status;

          // Switch into this gym's tenant context either way — a pending member
          // still needs X-Tenant-ID sent on later requests (e.g. GET /members/me)
          // so the app can detect and display the pending/locked state. The backend
          // (TenantContextFilter) blocks every member-facing endpoint except
          // discovery/profile/auth while approval_status is PENDING, regardless of
          // this switch, so it does not grant early access.
          const { setActiveTenant } = require('@/domains/auth/store/authStore').useAuthStore.getState();
          setActiveTenant(center.tenantSlug);

          if (approvalStatus === 'PENDING') {
            toast.success(
              `Your payment for ${plan.name} at ${center.centerName} is submitted and awaiting approval from gym staff.`,
              { title: 'Payment Submitted', duration: 5000 }
            );
          } else {
            toast.success(`You have successfully subscribed to ${plan.name} at ${center.centerName}. Your subscription is now active!`, {
              title: 'Purchase Successful! 🎉',
              duration: 4000,
            });
          }

          onSuccess();
          close();
        },
        onError: (err: any) => {
          if (err?.status === 409) {
            setStep('already-member');
            return;
          }
          toast.error(err?.message || 'Could not process the purchase.', { title: 'Purchase Failed' });
        }
      }
    );
  };

  return (
    <>
      <Modal visible={visible && step === 'offer'} animationType="slide" transparent onRequestClose={close}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.title}>Subscribe to {plan.name}</Text>
                <Text style={styles.subtitle}>{center.centerName}</Text>
              </View>
              <Pressable hitSlop={12} onPress={close} style={styles.closeButton}>
                <Feather name="x" size={20} color={BrandColors.textPrimary} />
              </Pressable>
            </View>

            <View style={styles.body}>
              <RewardPassPicker
                passContext={null}
                value={couponSel}
                onChange={setCouponSel}
                acceptPromotions
                validateCode={(code) =>
                  discountCodeApi.validateForCenter(center.tenantSlug, center.branchId, code, offerPrice)}
              />

              <View style={styles.priceCard}>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Price</Text>
                  <CurrencyValue style={styles.priceValue} amount={plan.price} />
                </View>
                {offerDiscount > 0 && (
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>{plan.offerLabel || 'Offer'}</Text>
                    <CurrencyValue style={styles.discountText} amount={-offerDiscount} />
                  </View>
                )}
                {couponDiscount > 0 && (
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>
                      {couponSel?.kind === 'coupon' && couponSel.coupon.source === 'PROMOTION'
                        ? couponSel.coupon.name || 'Promotion'
                        : 'Coupon'}
                    </Text>
                    <CurrencyValue style={styles.discountText} amount={-couponDiscount} />
                  </View>
                )}
                <View style={styles.divider} />
                <View style={styles.priceRow}>
                  <Text style={styles.totalLabel}>Total Payable</Text>
                  <CurrencyValue style={styles.totalValue} amount={totalAmount} />
                </View>
              </View>
            </View>

            <View style={styles.footer}>
              <Pressable style={styles.continueButton} onPress={() => setStep('pay')}>
                <Text style={styles.continueText}>Continue to Payment</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <PaymentBottomSheet
        visible={visible && step === 'pay'}
        amount={totalAmount}
        title={`Subscribe to ${plan.name}`}
        subtitle={center.centerName}
        allowDiscount={false}
        onClose={close}
        isProcessing={purchaseMutation.isPending}
        onComplete={handlePayNow}
      />

      <Modal visible={visible && step === 'already-member'} animationType="slide" transparent onRequestClose={close}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.noticeBody}>
              <View style={styles.noticeIcon}>
                <Feather name="user-check" size={28} color={BrandColors.memberGold} />
              </View>
              <Text style={styles.noticeTitle}>You're already subscribed</Text>
              <Text style={styles.noticeText}>
                You already have a subscription at {center.centerName}, so you can't purchase
                another one here.
              </Text>
            </View>

            <View style={styles.footer}>
              <Pressable style={styles.continueButton} onPress={close}>
                <Text style={styles.continueText}>Got it</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: BrandColors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: TypographyScale.title,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
    borderRadius: Radius.full,
    backgroundColor: BrandColors.screenBackground,
  },
  body: {
    padding: Spacing.four,
  },
  priceCard: {
    backgroundColor: BrandColors.screenBackground,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: Spacing.two,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceLabel: {
    fontSize: 13,
    color: BrandColors.textSecondary,
  },
  priceValue: {
    fontSize: 13,
    color: BrandColors.textPrimary,
  },
  discountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: Spacing.one,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.memberGold,
  },
  noticeBody: {
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.two,
  },
  noticeIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: BrandColors.screenBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  noticeTitle: {
    fontSize: TypographyScale.title,
    fontWeight: '800',
    color: BrandColors.textPrimary,
    textAlign: 'center',
  },
  noticeText: {
    fontSize: 14,
    color: BrandColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    padding: Spacing.four,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
  },
  continueButton: {
    backgroundColor: BrandColors.memberGold,
    paddingVertical: Spacing.four,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  continueText: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
