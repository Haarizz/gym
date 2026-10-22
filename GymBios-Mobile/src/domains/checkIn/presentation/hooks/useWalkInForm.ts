import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { PaymentResult } from '@/shared/payment/types';
import { attendanceKeys } from '@/domains/attendance/hooks/attendanceKeys';
import { checkInKeys } from '../../hooks/checkInKeys';
import { walkInApi, type PendingWalkInRegistration, type WalkInPaymentRequest } from '../../infrastructure/WalkInApi';

export function useWalkInForm() {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedPlanName, setSelectedPlanName] = useState<string>('');
  const [selectedPlanPrice, setSelectedPlanPrice] = useState<number>(0);
  // Set when staff are taking payment for a visitor who signed up with the walk-in QR.
  const [selfRegistration, setSelfRegistration] = useState<PendingWalkInRegistration | null>(null);

  const { mutateAsync: submitWalkIn, isPending } = useMutation({
    mutationFn: (request: WalkInPaymentRequest) => walkInApi.checkIn(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checkInKeys.today() });
      queryClient.invalidateQueries({ queryKey: checkInKeys.pendingWalkIns() });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
    },
  });

  /**
   * Called after the shared PaymentBottomSheet completes. Posts to the same walk-in
   * endpoint as the web desk, which records the visit plus its Daily Entry receipt
   * and, for a self-registration, confirms it and credits the staff whose QR was scanned.
   */
  const handlePaymentComplete = async (result: PaymentResult): Promise<boolean> => {
    if (!fullName.trim() || !phone.trim()) return false;

    try {
      await submitWalkIn({
        name: fullName.trim(),
        phone: phone.trim(),
        planName: selectedPlanName || selectedPlanId,
        payment: result,
        selfRegistrationId: selfRegistration?.id,
      });
      return true;
    } catch {
      return false;
    }
  };

  const selectPlan = (id: string, name: string, price: number) => {
    setSelectedPlanId(id);
    setSelectedPlanName(name);
    setSelectedPlanPrice(price);
  };

  /** Loads a self-registered visitor; the plan is applied by the screen once plans are known. */
  const loadSelfRegistration = (registration: PendingWalkInRegistration) => {
    setSelfRegistration(registration);
    setFullName(registration.name);
    setPhone(registration.phone);
    setPhotoUri(null);
    setSelectedPlanId('');
    setSelectedPlanName('');
    setSelectedPlanPrice(0);
  };

  const reset = () => {
    setFullName('');
    setPhone('');
    setPhotoUri(null);
    setSelectedPlanId('');
    setSelectedPlanName('');
    setSelectedPlanPrice(0);
    setSelfRegistration(null);
  };

  const isFormValid = fullName.trim().length > 0 && phone.trim().length > 0 && selectedPlanId.length > 0;

  return {
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
    isSubmitting: isPending,
    isFormValid,
    reset,
  };
}
