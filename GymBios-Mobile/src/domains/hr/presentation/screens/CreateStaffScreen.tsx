import { StaffWizardScreen } from './StaffWizardScreen';

interface CreateStaffScreenProps {
  onSuccess: () => void;
}

export function CreateStaffScreen({ onSuccess }: CreateStaffScreenProps) {
  return <StaffWizardScreen mode="create" onSuccess={onSuccess} />;
}