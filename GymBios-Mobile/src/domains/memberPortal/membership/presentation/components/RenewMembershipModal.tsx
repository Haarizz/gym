import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  ActivityIndicator,
} from 'react-native';
import { Trans, useTranslation } from 'react-i18next';
import { Text } from '@/shared/components/AppText';
import { useRouter } from 'expo-router';
import { toast } from '@/shared/components/Toasts/toastStore';
import Feather from '@expo/vector-icons/Feather';
import { CurrencyValue } from '@/core/providers';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { MembershipPlanCard } from './MembershipPlanCard';
import { useMemberMembership } from '../../hooks/useMemberMembership';
import { useMembershipPlanChangePreview } from '../../hooks/useMembershipPlanChangePreview';
import { useChangeMembershipPlan } from '../../hooks/useChangeMembershipPlan';
import { PaymentBottomSheet, type PaymentResult } from '@/shared/payment';
import { MembershipPlanPickerBottomSheet } from './MembershipPlanPickerBottomSheet';
import { RewardPassPicker, type RewardSelection } from '@/domains/member-referrals/presentation/components/RewardPassPicker';
import { discountCodeApi } from '@/domains/member-referrals/infrastructure/discountCodeApi';
import { useAuthStore } from '@/domains/auth/store/authStore';
import { useBranchContext } from '@/shared/providers/BranchProvider';
import type { MobileMembershipPlan } from '../../domain/models';

interface RenewMembershipModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** A promotion code to fill in and apply, e.g. from the dashboard's offer */
  promoCode?: string;
  /** An offer without a code, claimed from the dashboard: applied by id until the member removes it */
  offer?: { id: number; name: string };
}

export function RenewMembershipModal({
  visible,
  onClose,
  onSuccess,
  promoCode,
  offer: claimedOffer,
}: RenewMembershipModalProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const activeTenant = useAuthStore((state) => state.activeTenant);
  const { selectedBranchId } = useBranchContext();
  const { data: memberState, isLoading: isMemberLoading } = useMemberMembership();
  
  const currentPlan = memberState?.membership?.plan;
  const currentPlanId = currentPlan?.id;
  
  const [selectedPlanId, setSelectedPlanId] = useState<number | undefined>();
  const [showPayment, setShowPayment] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [rewardSel, setRewardSel] = useState<RewardSelection>(null);
  // The claimed offer stands in for a pass/coupon (one discount per renewal); removing it brings the picker back.
  const [removedOfferId, setRemovedOfferId] = useState<number | null>(null);
  const offer = claimedOffer && claimedOffer.id !== removedOfferId ? claimedOffer : null;
  const rewardFields = offer
    ? { promotionId: offer.id }
    : rewardSel?.kind === 'pass'
      ? { rewardPassId: rewardSel.pass.id }
      : rewardSel?.kind === 'coupon' ? { couponCode: rewardSel.coupon.code } : undefined;

  useEffect(() => {
    if (visible && currentPlanId && !selectedPlanId) {
      setSelectedPlanId(currentPlanId);
    }
  }, [visible, currentPlanId, selectedPlanId]);

  // The server prices the pass/coupon in the preview, so the total shown is what gets charged.
  const { data: preview, isFetching: isPreviewLoading, error: previewError } =
    useMembershipPlanChangePreview(selectedPlanId, rewardFields);

  // A pass/coupon the server rejects (e.g. it just expired) — shown inline; paying is
  // blocked until the member deselects it.
  const rewardError = (rewardSel || offer) && previewError ? previewError.message || t('membership.renew.rewardUnusable') : null;
  const changePlanMutation = useChangeMembershipPlan();

  const handlePaymentComplete = async (result: PaymentResult) => {
    if (!selectedPlanId) return;

    try {
      await changePlanMutation.mutateAsync({
        planId: selectedPlanId,
        paymentMethodUsed: result.paymentMethodUsed,
        paymentBreakdown: result.paymentBreakdown,
        ...rewardFields,
      });

      setShowPayment(false);
      Alert.alert(
        t('membership.renew.successTitle'),
        t('membership.renew.successMessage'),
        [
          {
            text: t('membership.renew.successButton'),
            onPress: () => {
              onSuccess();
              onClose();
            },
          },
        ]
      );
    } catch (error) {
      toast.error(t('membership.renew.updateFailed'));
    }
  };

  const getCtaLabel = () => {
    if (!preview) return t('membership.renew.selectSubscription');
    if (isPreviewLoading) return t('membership.renew.calculating');
    const key =
      preview.operation === 'RENEWAL'
        ? 'membership.renew.payAndRenew'
        : preview.operation === 'UPGRADE'
          ? 'membership.renew.payAndUpgrade'
          : 'membership.renew.payAndContinue';
    return <Trans i18nKey={key} components={{ amount: <CurrencyValue amount={preview.finalAmount} /> }} />;
  };

  const isReady = !isMemberLoading && !!preview && !!currentPlan;

  // Handle modal close
  const handleClose = () => {
    setSelectedPlanId(undefined); // Clear transient state
    setRewardSel(null);
    setRemovedOfferId(null);
    onClose();
  };

  // Switching onto a Family/Couple plan means adding the family members too, so it
  // goes through the family screen; renewing the family plan you're already on
  // stays a plain renewal here.
  const handleSelectPlan = (plan: MobileMembershipPlan) => {
    const type = plan.planType?.trim().toLowerCase();
    if ((type === 'family' || type === 'couple') && plan.id !== currentPlanId) {
      // The member's own branch from the server; the app's selected branch can still
      // be 'ALL' when it couldn't be resolved on the device.
      const branchId = memberState?.membership?.branch_id
        ?? (typeof selectedBranchId === 'number' ? selectedBranchId : null);
      if (!activeTenant || !branchId) {
        toast.error(t('membership.renew.familyOpenFailed'));
        return;
      }
      setShowPicker(false);
      handleClose();
      router.push({
        pathname: '/(member)/family/purchase' as any,
        params: {
          tenantSlug: activeTenant,
          branchId: String(branchId),
          planId: String(plan.id),
          mode: 'change',
        },
      });
      return;
    }
    setSelectedPlanId(plan.id);
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <View style={styles.headerInfo}>
                <Text style={styles.title}>{t('membership.renew.title')}</Text>
                <Text style={styles.subtitle}>{t('membership.renew.subtitle')}</Text>
              </View>
              <Pressable hitSlop={12} onPress={handleClose} style={styles.closeButton}>
                <Feather name="x" size={20} color={BrandColors.textPrimary} />
              </Pressable>
            </View>

            {!isReady ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={BrandColors.memberGold} />
              </View>
            ) : (
              <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
                
                <Text style={styles.sectionTitle}>{t('membership.renew.currentSubscription')}</Text>
                <View style={styles.plansContainer}>
                  <MembershipPlanCard
                    name={currentPlan.name}
                    price={currentPlan.price}
                    duration={currentPlan.duration}
                    isCurrent={true}
                    isSelected={false}
                    onSelect={() => {}}
                  />
                </View>

                <View style={styles.changePlanHeader}>
                  <Text style={[styles.sectionTitle, styles.changePlanTitle]}>{t('membership.renew.changeSubscription')}</Text>
                  <Pressable onPress={() => setShowPicker(true)} hitSlop={8}>
                    <Text style={styles.changePlanLink}>{t('membership.renew.chooseAnother')}</Text>
                  </Pressable>
                </View>
                
                <View style={styles.plansContainer}>
                  <Pressable onPress={() => setShowPicker(true)}>
                    <View pointerEvents="none">
                      <MembershipPlanCard
                        name={preview.selectedPlan.name}
                        price={preview.selectedPlan.effectivePrice}
                        regularPrice={preview.selectedPlan.price}
                        duration={preview.selectedPlan.duration}
                        isCurrent={preview.selectedPlan.id === currentPlanId}
                        isSelected={true}
                        onSelect={() => {}}
                      />
                    </View>
                  </Pressable>
                </View>

                {preview && (
                  <>
                    {/* Detected Operation Section */}
                    <View style={styles.operationCard}>
                      <Text style={styles.operationTitle}>
                        {preview.operation === 'RENEWAL'
                          ? t('membership.renew.detectedRenewal')
                          : preview.operation === 'UPGRADE'
                            ? t('membership.renew.detectedUpgrade')
                            : t('membership.renew.detectedDowngrade')}
                      </Text>
                      {preview.operation === 'RENEWAL' ? (
                        <Text style={styles.operationText}>{t('membership.renew.continuing', { name: preview.selectedPlan.name })}</Text>
                      ) : (
                        <Text style={styles.operationText}>
                          {currentPlan.name} → {preview.selectedPlan.name}
                        </Text>
                      )}
                    </View>

                    {/* Features Section */}
                    {preview.features && preview.features.length > 0 && (
                      <View style={styles.offerCard}>
                        <Text style={styles.offerTitle}>{t('membership.renew.features')}</Text>
                        <View style={styles.perksList}>
                          {preview.features.map((feature, index) => (
                            <View key={index} style={styles.perkRow}>
                              <Feather name="check" size={14} color="#15803D" />
                              <Text style={styles.perkText}>{feature}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {offer ? (
                      <View style={styles.offerCard}>
                        <Text style={styles.offerTitle}>{t('membership.renew.offerApplied', { name: offer.name })}</Text>
                        <Pressable hitSlop={8} onPress={() => setRemovedOfferId(offer.id)} accessibilityRole="button">
                          <Text style={styles.offerRemove}>{t('membership.renew.removeOffer')}</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <RewardPassPicker
                        passContext="MEMBERSHIP"
                        value={rewardSel}
                        onChange={setRewardSel}
                        validateCode={discountCodeApi.validate}
                        acceptPromotions
                        initialCode={promoCode}
                      />
                    )}
                    {rewardError && <Text style={styles.rewardError}>{rewardError}</Text>}

                    {/* Price Breakdown */}
                    <View style={styles.priceCard}>
                      <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>{t('membership.renew.regularPrice')}</Text>
                        <Text style={styles.originalPriceText}><CurrencyValue amount={preview.regularAmount} /></Text>
                      </View>
                      {preview.discountAmount > 0 && (
                        <View style={styles.priceRow}>
                          <Text style={styles.priceLabel}>{preview.offerLabel || t('membership.renew.offer')}</Text>
                          <Text style={styles.discountText}>-<CurrencyValue amount={preview.discountAmount} /></Text>
                        </View>
                      )}
                      {preview.rewardDiscountAmount > 0 && (
                        <View style={styles.priceRow}>
                          <Text style={styles.priceLabel}>
                            {offer ? offer.name : t(rewardSel?.kind === 'coupon' ? 'membership.renew.coupon' : 'membership.renew.rewardPass')}
                          </Text>
                          <Text style={styles.discountText}>-<CurrencyValue amount={preview.rewardDiscountAmount} /></Text>
                        </View>
                      )}
                      <View style={styles.divider} />
                      <View style={styles.priceRow}>
                        <Text style={styles.totalLabel}>{t('membership.renew.totalPayable')}</Text>
                        <Text style={styles.totalValue}><CurrencyValue amount={preview.finalAmount} /></Text>
                      </View>
                    </View>
                  </>
                )}
              </ScrollView>
            )}

            <View style={styles.footer}>
              <Pressable
                style={[styles.renewButton, (!isReady || isPreviewLoading || !!rewardError) && styles.renewButtonDisabled]}
                onPress={() => setShowPayment(true)}
                disabled={!isReady || isPreviewLoading || !!rewardError}
              >
                <Text style={styles.renewButtonText}>
                  {getCtaLabel()}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Plan Picker Sheet */}
      <MembershipPlanPickerBottomSheet
        visible={showPicker}
        currentPlanName={currentPlan?.name}
        selectedPlanId={selectedPlanId}
        onClose={() => setShowPicker(false)}
        onSelectPlan={handleSelectPlan}
      />

      {/* Payment Sheet */}
      {showPayment && preview && (
        <PaymentBottomSheet
          visible={showPayment}
          amount={preview.finalAmount}
          title={t('membership.renew.paymentFor', { name: preview.selectedPlan.name })}
          allowDiscount={false}
          onClose={() => setShowPayment(false)}
          onComplete={handlePaymentComplete}
        />
      )}
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
    maxHeight: '85%',
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
    gap: Spacing.three,
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
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
  loadingContainer: {
    padding: Spacing.four * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: Spacing.four,
  },
  sectionTitle: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '800',
    color: BrandColors.textPrimary,
    marginBottom: Spacing.three,
  },
  // Wraps the link under the title when both don't fit (narrow screens, large font scale).
  changePlanHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: Spacing.three,
    rowGap: Spacing.one,
    marginBottom: Spacing.three,
  },
  changePlanTitle: {
    marginBottom: 0,
    flexShrink: 1,
  },
  changePlanLink: {
    color: BrandColors.memberGold,
    fontWeight: '600',
    fontSize: 14,
  },
  plansContainer: {
    marginBottom: Spacing.four,
  },
  operationCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: Spacing.four,
  },
  operationTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  operationText: {
    fontSize: 14,
    color: '#1E40AF',
  },
  offerCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    marginBottom: Spacing.four,
  },
  offerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#14532D',
    marginBottom: Spacing.three,
  },
  perksList: {
    gap: Spacing.two,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  perkText: {
    fontSize: 13,
    color: '#166534',
    fontWeight: '500',
    flex: 1,
  },
  priceCard: {
    backgroundColor: BrandColors.screenBackground,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  priceLabel: {
    flex: 1,
    fontSize: 13,
    color: BrandColors.textSecondary,
  },
  originalPriceText: {
    fontSize: 13,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
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
  footer: {
    padding: Spacing.four,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
  },
  renewButton: {
    backgroundColor: BrandColors.memberGold,
    paddingVertical: Spacing.four,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  offerRemove: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
  },
  rewardError: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: -Spacing.two,
    marginBottom: Spacing.four,
  },
  renewButtonDisabled: {
    opacity: 0.6,
  },
  renewButtonText: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
