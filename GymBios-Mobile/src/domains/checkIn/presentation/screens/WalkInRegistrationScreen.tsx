import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
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
import { PendingSelfRegistrations } from '../components/walkIn/PendingSelfRegistrations';
import { WalkInQrModal } from '../components/walkIn/WalkInQrModal';
import { useWalkInForm } from '../hooks/useWalkInForm';
import { useWalkInPlans } from '../hooks/useWalkInPlans';
import { usePendingWalkInRegistrations } from '../hooks/useWalkInSelfRegistrations';
import type { PendingWalkInRegistration } from '../../infrastructure/WalkInApi';
import { checkInKeys } from '../../hooks/checkInKeys';

const CHECK_IN_COLORS: [string, string] = [BrandColors.teal, '#1a7a47'];

/**
 * Walk-In Registration Screen.
 *
 * Collects visitor information, lets the user select a Daily Plan,
 * then opens the shared PaymentBottomSheet.
 * On successful payment, submits the walk-in check-in to the backend.
 *
 * Visitors who signed up with the walk-in QR are listed on top; tapping one
 * loads them into the form, and paying confirms their self-registration.
 */
export function WalkInRegistrationScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const roleGroup = useSegments()[0] ?? '(admin)';
  const bottomInset = useTabBarBottomInset() + Spacing.six;
  const queryClient = useQueryClient();
  const [isPaymentVisible, setIsPaymentVisible] = useState(false);
  const [isQrVisible, setIsQrVisible] = useState(false);
  const { plans } = useWalkInPlans();
  const { pending, dismiss } = usePendingWalkInRegistrations();

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
    selfRegistration,
    loadSelfRegistration,
    handlePaymentComplete,
    isSubmitting,
    isFormValid,
    reset,
  } = useWalkInForm();

  const handleSelectPending = (registration: PendingWalkInRegistration) => {
    loadSelfRegistration(registration);
    const plan = plans.find((p) => String(p.id) === String(registration.planId));
    if (plan) selectPlan(String(plan.id), plan.name, plan.price);
  };

  const handleDismissPending = (registration: PendingWalkInRegistration) => {
    if (selfRegistration?.id === registration.id) reset();
    dismiss.mutate(registration.id);
  };

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
        rightAction={
          <Pressable
            onPress={() => setIsQrVisible(true)}
            style={styles.headerAction}
            accessibilityRole="button"
            accessibilityLabel={t('checkIn.walkIn.qrTitle')}
          >
            <Feather name="grid" size={18} color="#ffffff" />
          </Pressable>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomInset }]}
        keyboardShouldPersistTaps="handled"
      >
        <PendingSelfRegistrations
          pending={pending}
          selectedId={selfRegistration?.id}
          onSelect={handleSelectPending}
          onDismiss={handleDismissPending}
        />

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

      <WalkInQrModal visible={isQrVisible} onClose={() => setIsQrVisible(false)} />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  headerAction: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
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
