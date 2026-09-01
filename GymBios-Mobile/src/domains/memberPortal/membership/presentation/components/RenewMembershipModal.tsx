import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { toast } from '@/shared/components/Toasts/toastStore';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { MembershipPlanCard } from './MembershipPlanCard';
import { useMemberMembership } from '../../hooks/useMemberMembership';
import { useMembershipPlanChangePreview } from '../../hooks/useMembershipPlanChangePreview';
import { useChangeMembershipPlan } from '../../hooks/useChangeMembershipPlan';
import { PaymentBottomSheet, type PaymentResult } from '@/shared/payment';
import { MembershipPlanPickerBottomSheet } from './MembershipPlanPickerBottomSheet';

interface RenewMembershipModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RenewMembershipModal({
  visible,
  onClose,
  onSuccess,
}: RenewMembershipModalProps) {
  const { data: memberState, isLoading: isMemberLoading } = useMemberMembership();
  
  const currentPlan = memberState?.membership?.plan;
  const currentPlanId = currentPlan?.id;
  
  const [selectedPlanId, setSelectedPlanId] = useState<number | undefined>();
  const [showPayment, setShowPayment] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (visible && currentPlanId && !selectedPlanId) {
      setSelectedPlanId(currentPlanId);
    }
  }, [visible, currentPlanId, selectedPlanId]);

  const { data: preview, isFetching: isPreviewLoading } = useMembershipPlanChangePreview(selectedPlanId);
  const changePlanMutation = useChangeMembershipPlan();

  const handlePaymentComplete = async (result: PaymentResult) => {
    if (!selectedPlanId) return;

    try {
      await changePlanMutation.mutateAsync({
        planId: selectedPlanId,
        paymentMethodUsed: result.paymentMethodUsed,
        paymentBreakdown: result.paymentBreakdown,
      });

      setShowPayment(false);
      Alert.alert(
        'Success! 🎉',
        'Your membership plan has been updated successfully.',
        [
          {
            text: 'Awesome!',
            onPress: () => {
              onSuccess();
              onClose();
            },
          },
        ]
      );
    } catch (error) {
      toast.error('Failed to update membership plan. Please try again.');
    }
  };

  const getCtaLabel = () => {
    if (!preview) return 'Select Plan';
    if (isPreviewLoading) return 'Calculating...';
    const amount = preview.finalAmount.toLocaleString();
    
    switch (preview.operation) {
      case 'RENEWAL': return `Pay ₹${amount} & Renew`;
      case 'UPGRADE': return `Pay ₹${amount} & Upgrade`;
      case 'DOWNGRADE': return `Pay ₹${amount} & Continue`;
      default: return `Pay ₹${amount} & Continue`;
    }
  };

  const isReady = !isMemberLoading && !!preview && !!currentPlan;

  // Handle modal close
  const handleClose = () => {
    setSelectedPlanId(undefined); // Clear transient state
    onClose();
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Membership Plan</Text>
                <Text style={styles.subtitle}>Select a plan to continue</Text>
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
                
                <Text style={styles.sectionTitle}>Current Plan</Text>
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
                  <Text style={styles.sectionTitle}>Change Plan</Text>
                  <Pressable onPress={() => setShowPicker(true)}>
                    <Text style={styles.changePlanLink}>Choose another plan ›</Text>
                  </Pressable>
                </View>
                
                <View style={styles.plansContainer}>
                  <Pressable onPress={() => setShowPicker(true)}>
                    <View pointerEvents="none">
                      <MembershipPlanCard
                        name={preview.selectedPlan.name}
                        price={preview.selectedPlan.price}
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
                        Detected as {preview.operation.charAt(0) + preview.operation.slice(1).toLowerCase()}
                      </Text>
                      {preview.operation === 'RENEWAL' ? (
                        <Text style={styles.operationText}>Continuing {preview.selectedPlan.name}</Text>
                      ) : (
                        <Text style={styles.operationText}>
                          {currentPlan.name} → {preview.selectedPlan.name}
                        </Text>
                      )}
                    </View>

                    {/* Features Section */}
                    {preview.features && preview.features.length > 0 && (
                      <View style={styles.offerCard}>
                        <Text style={styles.offerTitle}>Plan Features</Text>
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

                    {/* Price Breakdown */}
                    <View style={styles.priceCard}>
                      <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Regular Price</Text>
                        <Text style={styles.originalPriceText}>₹{preview.regularAmount.toLocaleString()}</Text>
                      </View>
                      {preview.discountAmount > 0 && (
                        <View style={styles.priceRow}>
                          <Text style={styles.priceLabel}>Discount Applied</Text>
                          <Text style={styles.discountText}>-₹{preview.discountAmount.toLocaleString()}</Text>
                        </View>
                      )}
                      <View style={styles.divider} />
                      <View style={styles.priceRow}>
                        <Text style={styles.totalLabel}>Total Payable</Text>
                        <Text style={styles.totalValue}>₹{preview.finalAmount.toLocaleString()}</Text>
                      </View>
                    </View>
                  </>
                )}
              </ScrollView>
            )}

            <View style={styles.footer}>
              <Pressable
                style={[styles.renewButton, (!isReady || isPreviewLoading) && styles.renewButtonDisabled]}
                onPress={() => setShowPayment(true)}
                disabled={!isReady || isPreviewLoading}
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
        onSelectPlan={(plan) => setSelectedPlanId(plan.id)}
      />

      {/* Payment Sheet */}
      {showPayment && preview && (
        <PaymentBottomSheet
          visible={showPayment}
          amount={preview.finalAmount}
          title={`Payment for ${preview.selectedPlan.name}`}
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
  changePlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  changePlanLink: {
    color: BrandColors.memberGold,
    fontWeight: '600',
    fontSize: 14,
    marginBottom: Spacing.three,
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
  },
  priceLabel: {
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
  renewButtonDisabled: {
    opacity: 0.6,
  },
  renewButtonText: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
