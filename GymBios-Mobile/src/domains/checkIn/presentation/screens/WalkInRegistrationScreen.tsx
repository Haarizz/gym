import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { AppHeader } from '@/shared/components/AppHeader';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { Button } from '@/shared/components/Button';
import { Typography } from '@/shared/components/Typography';
import { BrandColors, BottomTabInset, Radius, Spacing } from '@/core/theme';
import { PaymentBottomSheet } from '@/shared/payment';
import type { PaymentResult } from '@/shared/payment/types';

import { WalkInForm } from '../components/walkIn/WalkInForm';
import { useWalkInForm } from '../hooks/useWalkInForm';
import { checkInKeys } from '../../hooks/checkInKeys';

const CHECK_IN_COLORS: [string, string] = [BrandColors.teal, '#1a7a47'];

/**
 * Walk-In Registration Screen.
 *
 * Collects visitor information, lets the user select a Daily Plan,
 * then opens the shared PaymentBottomSheet.
 * On successful payment, submits the walk-in check-in to the backend.
 */
export function WalkInRegistrationScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isPaymentVisible, setIsPaymentVisible] = useState(false);

  const {
    fullName,
    setFullName,
    phone,
    setPhone,
    photoUri,
    setPhotoUri,
    selectedPlanId,
    selectedPlanName,
    selectedPlanPrice,
    selectPlan,
    handlePaymentComplete,
    isSubmitting,
    isFormValid,
    reset,
  } = useWalkInForm();

  const handleProceedToPayment = () => {
    if (isFormValid) {
      setIsPaymentVisible(true);
    }
  };

  const handlePaymentClose = () => {
    setIsPaymentVisible(false);
  };

  const handlePaymentDone = useCallback(
    async (result: PaymentResult) => {
      setIsPaymentVisible(false);
      const success = await handlePaymentComplete(result);
      if (success) {
        // Invalidate today's check-ins so the visitors list updates
        queryClient.invalidateQueries({ queryKey: checkInKeys.today() });
        reset();
        // Navigate to today's visitors screen to show the newly registered visitor
        router.replace('/(admin)/check-in/walk-in/visitors');
      }
    },
    [handlePaymentComplete, queryClient, reset, router],
  );

  return (
    <ScreenLayout>
      <AppHeader
        title="Register Visitor"
        subtitle="Walk-in / daily visitor registration"
        colors={CHECK_IN_COLORS}
        onBack={() => router.back()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <WalkInForm
          fullName={fullName}
          onChangeFullName={setFullName}
          phone={phone}
          onChangePhone={setPhone}
          photoUri={photoUri}
          onPhotoChange={setPhotoUri}
          selectedPlanId={selectedPlanId}
          selectedPlanName={selectedPlanName}
          selectedPlanPrice={selectedPlanPrice}
          onSelectPlan={selectPlan}
        />

        {/* Proceed to Payment — only enabled when form is valid */}
        <View style={styles.actionBar}>
          <Button
            label="Cancel"
            variant="ghost"
            onPress={() => {
              reset();
              router.back();
            }}
            style={styles.cancelBtn}
            disabled={isSubmitting}
          />
          <Button
            label="Proceed to Payment"
            variant="primary"
            onPress={handleProceedToPayment}
            style={styles.proceedBtn}
            disabled={!isFormValid || isSubmitting}
          />
        </View>
      </ScrollView>

      {/* Shared Payment Bottom Sheet — amount comes from selected plan */}
      <PaymentBottomSheet
        visible={isPaymentVisible}
        amount={selectedPlanPrice}
        title={selectedPlanName || 'Walk-In Pass'}
        subtitle={`Daily visitor plan — ${fullName}`}
        allowDiscount={false}
        onClose={handlePaymentClose}
        onComplete={handlePaymentDone}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.three,
    gap: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
  },
  actionBar: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  cancelBtn: {
    flex: 1,
  },
  proceedBtn: {
    flex: 2,
  },
});
