import { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import type { MembershipPlanItem } from './PlanCard';
import type { CenterItem } from './CenterCard';

interface PlanPurchaseModalProps {
  visible: boolean;
  plan: MembershipPlanItem | null;
  center: CenterItem | null;
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
  const [paymentMode, setPaymentMode] = useState<'card' | 'bnpl' | 'cash'>('card');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!plan || !center) return null;

  const taxAmount = Math.round((plan.price * plan.taxPct) / 100);
  const totalAmount = plan.price + taxAmount;

  const handlePayNow = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      Alert.alert(
        'Purchase Successful! 🎉',
        `You have successfully subscribed to ${plan.name} at ${center.name}. Your membership is now active!`,
        [
          {
            text: 'Great!',
            onPress: () => {
              onSuccess();
              onClose();
            },
          },
        ]
      );
    }, 800);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Confirm Membership</Text>
              <Text style={styles.subtitle}>{center.name}</Text>
            </View>
            <Pressable hitSlop={12} onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={20} color={BrandColors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.body}>
            {/* Plan Summary Card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Selected Plan</Text>
                <Text style={styles.summaryValue}>{plan.name}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Duration</Text>
                <Text style={styles.summaryValue}>{plan.duration}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Base Price</Text>
                <Text style={styles.summaryValue}>₹{plan.price.toLocaleString()}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>GST ({plan.taxPct}%)</Text>
                <Text style={styles.summaryValue}>₹{taxAmount.toLocaleString()}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total Payable</Text>
                <Text style={styles.totalValue}>₹{totalAmount.toLocaleString()}</Text>
              </View>
            </View>

            {/* Payment Method Selector */}
            <Text style={styles.sectionTitle}>Select Payment Method</Text>
            <View style={styles.paymentOptions}>
              <Pressable
                style={[
                  styles.paymentOption,
                  paymentMode === 'card' && styles.paymentOptionSelected,
                ]}
                onPress={() => setPaymentMode('card')}
              >
                <Feather
                  name="credit-card"
                  size={20}
                  color={paymentMode === 'card' ? BrandColors.teal : BrandColors.textSecondary}
                />
                <View style={styles.paymentInfo}>
                  <Text
                    style={[
                      styles.paymentName,
                      paymentMode === 'card' && styles.paymentNameSelected,
                    ]}
                  >
                    Credit / Debit Card
                  </Text>
                  <Text style={styles.paymentDesc}>Instant activation & auto-renewal</Text>
                </View>
                {paymentMode === 'card' && (
                  <Feather name="check-circle" size={18} color={BrandColors.teal} />
                )}
              </Pressable>

              <Pressable
                style={[
                  styles.paymentOption,
                  paymentMode === 'bnpl' && styles.paymentOptionSelected,
                ]}
                onPress={() => setPaymentMode('bnpl')}
              >
                <Feather
                  name="zap"
                  size={20}
                  color={paymentMode === 'bnpl' ? BrandColors.memberGold : BrandColors.textSecondary}
                />
                <View style={styles.paymentInfo}>
                  <Text
                    style={[
                      styles.paymentName,
                      paymentMode === 'bnpl' && styles.paymentNameSelected,
                    ]}
                  >
                    Pay in 3 (BNPL)
                  </Text>
                  <Text style={styles.paymentDesc}>
                    3 x ₹{Math.round(totalAmount / 3).toLocaleString()} interest-free
                  </Text>
                </View>
                {paymentMode === 'bnpl' && (
                  <Feather name="check-circle" size={18} color={BrandColors.memberGold} />
                )}
              </Pressable>

              <Pressable
                style={[
                  styles.paymentOption,
                  paymentMode === 'cash' && styles.paymentOptionSelected,
                ]}
                onPress={() => setPaymentMode('cash')}
              >
                <Feather
                  name="dollar-sign"
                  size={20}
                  color={paymentMode === 'cash' ? BrandColors.trainerAmber : BrandColors.textSecondary}
                />
                <View style={styles.paymentInfo}>
                  <Text
                    style={[
                      styles.paymentName,
                      paymentMode === 'cash' && styles.paymentNameSelected,
                    ]}
                  >
                    Pay at Desk
                  </Text>
                  <Text style={styles.paymentDesc}>Pay via Cash/UPI at the reception</Text>
                </View>
                {paymentMode === 'cash' && (
                  <Feather name="check-circle" size={18} color={BrandColors.trainerAmber} />
                )}
              </Pressable>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={[styles.payButton, isProcessing && styles.payButtonDisabled]}
              onPress={handlePayNow}
              disabled={isProcessing}
            >
              <Text style={styles.payButtonText}>
                {isProcessing
                  ? 'Processing...'
                  : `Pay ₹${totalAmount.toLocaleString()} & Activate`}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
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
  body: {
    padding: Spacing.four,
  },
  summaryCard: {
    backgroundColor: BrandColors.screenBackground,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 13,
    color: BrandColors.textSecondary,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.textPrimary,
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
    color: BrandColors.teal,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    marginBottom: Spacing.three,
  },
  paymentOptions: {
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three + 2,
    borderRadius: Radius.md,
    backgroundColor: BrandColors.screenBackground,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: Spacing.three,
  },
  paymentOptionSelected: {
    borderColor: BrandColors.teal,
    backgroundColor: '#F0FDFA',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentName: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  paymentNameSelected: {
    color: BrandColors.teal,
  },
  paymentDesc: {
    fontSize: TypographyScale.small,
    color: BrandColors.textSecondary,
    marginTop: 2,
  },
  footer: {
    padding: Spacing.four,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: BrandColors.surface,
  },
  payButton: {
    backgroundColor: BrandColors.teal,
    paddingVertical: Spacing.four,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
