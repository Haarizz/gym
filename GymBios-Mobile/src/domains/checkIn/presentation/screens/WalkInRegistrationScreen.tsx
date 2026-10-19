import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/shared/components/AppHeader';
import { ScreenLayout, useTabBarBottomInset } from '@/shared/layouts/ScreenLayout';
import { Button } from '@/shared/components/Button';
import { Typography } from '@/shared/components/Typography';
import { BrandColors, Radius, Spacing } from '@/core/theme';
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
  const { t } = useTranslation();
  const router = useRouter();
  const roleGroup = useSegments()[0] ?? '(admin)';
  const bottomInset = useTabBarBottomInset() + Spacing.six;
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
        // Admin nests walk-ins under check-in/walk-in; staff and trainer apps don't.
        router.replace(
          (roleGroup === '(admin)'
            ? '/(admin)/check-in/walk-in/visitors'
            : `/${roleGroup}/check-in/visitors`) as any,
        );
      }
    },
    [handlePaymentComplete, queryClient, reset, roleGroup, router],
  );

  return (
    <ScreenLayout>
      <AppHeader
        title={t('checkIn.walkIn.registerTitle')}
        subtitle={t('checkIn.walkIn.registerScreenSubtitle')}
        colors={CHECK_IN_COLORS}
        onBack={() => router.back()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomInset }]}
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
            label={t('checkIn.walkIn.cancel')}
            variant="ghost"
            onPress={() => {
              reset();
              router.back();
            }}
            style={styles.cancelBtn}
            disabled={isSubmitting}
          />
          <Button
            label={t('checkIn.walkIn.proceedToPayment')}
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
        title={selectedPlanName || t('checkIn.walkIn.walkInPassFallback')}
        subtitle={t('checkIn.walkIn.visitorPassSubtitle', { name: fullName })}
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
