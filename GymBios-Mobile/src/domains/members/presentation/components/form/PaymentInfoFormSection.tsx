import { Dropdown } from '@/shared/components/Dropdown';
import { Input } from '@/shared/components/Input';
import { FormSection } from '@/shared/components/FormSection';
import { PAYMENT_METHODS, PAYMENT_STATUSES } from '@/domains/members/constants';

interface PaymentInfoFormSectionProps {
  paymentStatus: string;
  paymentMethod: string;
  outstandingBalance: string;
  discount: string;
  errors?: Partial<Record<string, string>>;
  onChangePaymentStatus: (value: string) => void;
  onChangePaymentMethod: (value: string) => void;
  onChangeOutstandingBalance: (value: string) => void;
  onChangeDiscount: (value: string) => void;
}

export function PaymentInfoFormSection({
  paymentStatus,
  paymentMethod,
  outstandingBalance,
  discount,
  errors,
  onChangePaymentStatus,
  onChangePaymentMethod,
  onChangeOutstandingBalance,
  onChangeDiscount,
}: PaymentInfoFormSectionProps) {
  return (
    <FormSection title="Payment Information">
      <Dropdown
        label="Payment Status"
        placeholder="Select payment status"
        value={paymentStatus}
        options={PAYMENT_STATUSES}
        onChange={onChangePaymentStatus}
        error={errors?.paymentStatus}
      />
      <Dropdown
        label="Payment Method"
        placeholder="Select payment method"
        value={paymentMethod}
        options={PAYMENT_METHODS}
        onChange={onChangePaymentMethod}
        error={errors?.paymentMethod}
      />
      <Input
        label="Outstanding Balance"
        value={outstandingBalance}
        onChangeText={onChangeOutstandingBalance}
        placeholder="0.00"
        keyboardType="decimal-pad"
        error={errors?.outstandingBalance}
      />
      <Input
        label="Discount"
        value={discount}
        onChangeText={onChangeDiscount}
        placeholder="0.00"
        keyboardType="decimal-pad"
        error={errors?.discount}
      />
    </FormSection>
  );
}