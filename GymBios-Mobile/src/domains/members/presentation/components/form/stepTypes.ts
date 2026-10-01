import type { MemberWizardData, StepErrors } from '@/domains/members/hooks/useMemberWizard';

export interface MemberStepProps {
  data: MemberWizardData;
  updateField: (field: keyof MemberWizardData, value: any) => void;
  /** Validation messages to show inline — only populated after the user tries to continue. */
  errors?: StepErrors;
}
