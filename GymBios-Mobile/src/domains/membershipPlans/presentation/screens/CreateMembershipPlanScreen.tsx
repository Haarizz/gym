import { MembershipPlanForm } from '../components/MembershipPlanForm';

interface CreateMembershipPlanScreenProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function CreateMembershipPlanScreen({
  onSuccess,
  onCancel,
}: CreateMembershipPlanScreenProps) {
  return (
    <MembershipPlanForm
      mode="create"
      onSuccess={onSuccess}
      onCancel={onCancel}
    />
  );
}
