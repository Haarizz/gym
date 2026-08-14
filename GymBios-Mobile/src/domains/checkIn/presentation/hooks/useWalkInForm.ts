import { useState } from 'react';
import { useCheckIn } from '../../hooks/useCheckInActions';
import type { PaymentResult } from '@/shared/payment/types';

export function useWalkInForm() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedPlanName, setSelectedPlanName] = useState<string>('');
  const [selectedPlanPrice, setSelectedPlanPrice] = useState<number>(0);

  const { mutateAsync: checkIn, isPending } = useCheckIn();

  /**
   * Called after the shared PaymentBottomSheet completes successfully.
   * Maps the PaymentResult to a CheckInRequest and submits to the backend.
   */
  const handlePaymentComplete = async (result: PaymentResult): Promise<boolean> => {
    if (!fullName.trim() || !phone.trim()) return false;

    try {
      await checkIn({
        name: fullName.trim(),
        phone: phone.trim(),
        sessionType: selectedPlanName || selectedPlanId,
        paymentMethod: result.paymentMethodUsed,
        paymentStatus: result.paymentStatus === 'PAID' ? 'Paid' : 'Pending',
        amount: result.summary.finalAmount,
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

  const reset = () => {
    setFullName('');
    setPhone('');
    setPhotoUri(null);
    setSelectedPlanId('');
    setSelectedPlanName('');
    setSelectedPlanPrice(0);
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
    handlePaymentComplete,
    isSubmitting: isPending,
    isFormValid,
    reset,
  };
}
