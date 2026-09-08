import { useState } from 'react';
import { toast } from '@/shared/components/Toasts/toastStore';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import type { CenterPlan, CenterSummary } from '@/domains/discovery';
import { usePurchaseMembership } from '@/domains/discovery/hooks/usePurchaseMembership';
import { PaymentBottomSheet } from '@/shared/payment/presentation/bottomSheets/PaymentBottomSheet';
import type { PaymentResult } from '@/shared/payment/types';

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

  if (!plan || !center) return null;

  const totalAmount = plan.price;

  const handlePayNow = (result: PaymentResult) => {
    purchaseMutation.mutate(
      {
        tenantSlug: center.tenantSlug,
        branchId: center.branchId,
        planId: plan.id,
      },
      {
        onSuccess: () => {
          toast.success(`You have successfully subscribed to ${plan.name} at ${center.centerName}. Your membership is now active!`, {
            title: 'Purchase Successful! 🎉',
            duration: 4000,
          });
          
          // Import useAuthStore dynamically or normally
          const { setActiveTenant } = require('@/domains/auth/store/authStore').useAuthStore.getState();
          setActiveTenant(center.tenantSlug);
          
          onSuccess();
          onClose();
        },
        onError: (err: any) => {
          toast.error(err?.message || 'Could not process the purchase.', { title: 'Purchase Failed' });
        }
      }
    );
  };

  return (
    <PaymentBottomSheet
      visible={visible}
      amount={totalAmount}
      title={`Subscribe to ${plan.name}`}
      subtitle={center.centerName}
      currency="₹"
      allowDiscount={false}
      onClose={onClose}
      isProcessing={purchaseMutation.isPending}
      onComplete={handlePayNow}
    />
  );
}
