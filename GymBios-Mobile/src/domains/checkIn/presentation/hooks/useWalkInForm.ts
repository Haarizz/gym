import { useState } from 'react';
import { useCheckIn } from '../../hooks/useCheckInActions';

export function useWalkInForm() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');

  const { mutateAsync: checkIn, isPending } = useCheckIn();

  const handleRegister = async () => {
    // Basic validation
    if (!fullName || !phone) return false;

    try {
      await checkIn({
        name: fullName,
        phone: phone,
        sessionType: selectedPlanId,
        paymentMethod: paymentMethod,
        paymentStatus: 'Paid', // Assuming upfront payment for now
        amount: 154, // Hardcoded for mockup based on web UI
      });
      return true;
    } catch (error) {
      return false;
    }
  };

  const reset = () => {
    setFullName('');
    setPhone('');
    setPhotoUri(null);
    setSelectedPlanId('');
    setPaymentMethod('Cash');
  };

  return {
    fullName,
    setFullName,
    phone,
    setPhone,
    photoUri,
    setPhotoUri,
    selectedPlanId,
    setSelectedPlanId,
    paymentMethod,
    setPaymentMethod,
    handleRegister,
    isSubmitting: isPending,
    reset,
  };
}
