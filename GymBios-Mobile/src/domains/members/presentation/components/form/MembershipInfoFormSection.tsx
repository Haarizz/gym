import { DatePicker } from '@/shared/components/DatePicker';
import { Dropdown, type DropdownOption } from '@/shared/components/Dropdown';
import { Input } from '@/shared/components/Input';
import { FormSection } from '@/shared/components/FormSection';
import {
  MEMBERSHIP_TYPES,
  MEMBER_STATUSES,
} from '@/domains/members/constants';

const MEMBERSHIP_TYPE_OPTIONS: DropdownOption[] = MEMBERSHIP_TYPES.map(
  ({ value, label }) => ({ value, label }),
);

interface MembershipInfoFormSectionProps {
  membershipType: string;
  membershipPlanId: string;
  joinDate: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  monthlyFee: string;
  membershipFee: string;
  status: string;
  errors?: Partial<Record<string, string>>;
  onChangeMembershipType: (value: string) => void;
  onChangeMembershipPlanId: (value: string) => void;
  onChangeJoinDate: (date: Date | null) => void;
  onChangeStartDate: (date: Date | null) => void;
  onChangeEndDate: (date: Date | null) => void;
  onChangeMonthlyFee: (value: string) => void;
  onChangeMembershipFee: (value: string) => void;
  onChangeStatus: (value: string) => void;
}

export function MembershipInfoFormSection({
  membershipType,
  membershipPlanId,
  joinDate,
  startDate,
  endDate,
  monthlyFee,
  membershipFee,
  status,
  errors,
  onChangeMembershipType,
  onChangeMembershipPlanId,
  onChangeJoinDate,
  onChangeStartDate,
  onChangeEndDate,
  onChangeMonthlyFee,
  onChangeMembershipFee,
  onChangeStatus,
}: MembershipInfoFormSectionProps) {
  return (
    <FormSection title="Membership Information">
      <Dropdown
        label="Membership Type *"
        placeholder="Select membership type"
        value={membershipType}
        options={MEMBERSHIP_TYPE_OPTIONS}
        onChange={onChangeMembershipType}
        required
        error={errors?.membershipType}
      />
      <Dropdown
        label="Membership Status"
        placeholder="Select status"
        value={status}
        options={MEMBER_STATUSES}
        onChange={onChangeStatus}
        error={errors?.status}
      />
      <Input
        label="Membership Plan ID"
        value={membershipPlanId}
        onChangeText={onChangeMembershipPlanId}
        placeholder="e.g. 1"
        keyboardType="number-pad"
        error={errors?.membershipPlanId}
      />
      <DatePicker
        label="Join Date"
        placeholder="Select join date"
        value={joinDate}
        onChange={onChangeJoinDate}
        error={errors?.joinDate}
      />
      <DatePicker
        label="Start Date"
        placeholder="Select start date"
        value={startDate}
        onChange={onChangeStartDate}
        error={errors?.startDate}
      />
      <DatePicker
        label="End Date"
        placeholder="Select end date"
        value={endDate}
        onChange={onChangeEndDate}
        error={errors?.endDate}
      />
      <Input
        label="Monthly Fee"
        value={monthlyFee}
        onChangeText={onChangeMonthlyFee}
        placeholder="0.00"
        keyboardType="decimal-pad"
        error={errors?.monthlyFee}
      />
      <Input
        label="Membership Fee"
        value={membershipFee}
        onChangeText={onChangeMembershipFee}
        placeholder="0.00"
        keyboardType="decimal-pad"
        error={errors?.membershipFee}
      />
    </FormSection>
  );
}