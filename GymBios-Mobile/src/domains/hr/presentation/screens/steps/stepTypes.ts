import type { StaffStepErrors, StaffWizardData } from '../../hooks/useStaffWizard';

export interface StaffStepProps {
  data: StaffWizardData;
  updateField: <K extends keyof StaffWizardData>(field: K, value: StaffWizardData[K]) => void;
  /** Validation messages to show inline — only populated after the user tries to continue. */
  errors?: StaffStepErrors;
}
