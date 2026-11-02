import { useCallback, useMemo, useState } from 'react';

import type { Staff, StaffCertification, WeeklySchedule } from '../../domain/Staff';
import type { CreateStaffRequest, UpdateStaffRequest } from '../../application/StaffRepository';
import { useCreateStaff, useUpdateStaff } from './useStaff';
import { resolveImageUrl } from '@/shared/utils/resolveImageUrl';
import i18n from '@/core/i18n/i18n';

export interface StaffWizardData {
  name: string;
  email: string;
  phone: string;
  address: string;
  photoUrl: string;
  photoUri?: string;
  photoStatus: 'idle' | 'uploading' | 'error';
  role: string;
  department: string;
  branch: string;
  joinDate: string;
  status: string;
  salary: string;
  monthlyTarget: string;
  certifications: StaffCertification[];
  schedule: WeeklySchedule;
  username: string;
  password: string;
  confirmPassword: string;
  appAccessEnabled: boolean;
}

export type WizardMode = 'create' | 'edit';

/** Field-level validation messages, keyed by the wizard field they belong to. */
export type StaffStepErrors = Partial<Record<keyof StaffWizardData, string>>;

export interface WizardStep {
  id: string;
  title: string;
  validate: (data: StaffWizardData, mode: WizardMode) => StaffStepErrors;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9\s\-()]{7,20}$/;
const MIN_PASSWORD_LENGTH = 6;

function validatePersonal(data: StaffWizardData): StaffStepErrors {
  const errors: StaffStepErrors = {};
  if (data.name.trim().length < 2) errors.name = i18n.t('shared.formErrors.staffName');

  const email = data.email.trim();
  if (!email) errors.email = i18n.t('shared.formErrors.emailRequired');
  else if (!EMAIL_PATTERN.test(email)) errors.email = i18n.t('shared.formErrors.emailInvalid');

  const phone = data.phone.trim();
  if (!phone) errors.phone = i18n.t('shared.formErrors.phoneRequired');
  else if (!PHONE_PATTERN.test(phone) || phone.replace(/\D/g, '').length < 7) {
    errors.phone = i18n.t('shared.formErrors.phoneInvalid');
  }

  if (data.photoStatus === 'uploading') errors.photoUrl = i18n.t('shared.formErrors.photoUploading');
  return errors;
}

function validateEmployment(data: StaffWizardData): StaffStepErrors {
  const errors: StaffStepErrors = {};
  if (!data.role.trim()) errors.role = i18n.t('shared.formErrors.chooseRole');
  if (!data.department.trim()) errors.department = i18n.t('shared.formErrors.chooseDepartment');
  if (!data.branch.trim()) errors.branch = i18n.t('shared.formErrors.chooseBranch');
  return errors;
}

function validateCompensation(data: StaffWizardData): StaffStepErrors {
  const errors: StaffStepErrors = {};
  const salary = data.salary.trim();
  if (salary && !(Number(salary) >= 0)) errors.salary = i18n.t('shared.formErrors.invalidAmount');
  const target = data.monthlyTarget.trim();
  if (target && !(Number(target) >= 0)) errors.monthlyTarget = i18n.t('shared.formErrors.invalidAmount');
  return errors;
}

function validateAccess(data: StaffWizardData, mode: WizardMode): StaffStepErrors {
  const errors: StaffStepErrors = {};
  if (!data.appAccessEnabled) return errors;

  const username = data.username.trim();
  if (!username) errors.username = i18n.t('shared.formErrors.usernameRequired');
  else if (/\s/.test(username)) errors.username = i18n.t('shared.formErrors.usernameSpaces');
  else if (username.length < 3) errors.username = i18n.t('shared.formErrors.usernameShort');

  // An existing login keeps its password when this is left blank on edit.
  const passwordOptional = mode === 'edit';
  if (!data.password) {
    if (!passwordOptional) errors.password = i18n.t('shared.formErrors.passwordRequired');
  } else if (data.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = i18n.t('shared.formErrors.passwordShort', { min: MIN_PASSWORD_LENGTH });
  }
  if ((data.password || data.confirmPassword) && data.password !== data.confirmPassword) {
    errors.confirmPassword = i18n.t('shared.formErrors.passwordMismatch');
  }
  return errors;
}

const STEPS: WizardStep[] = [
  { id: 'personal', get title() { return i18n.t('hr.wizardSteps.personal'); }, validate: validatePersonal },
  { id: 'employment', get title() { return i18n.t('hr.wizardSteps.employment'); }, validate: validateEmployment },
  { id: 'compensation', get title() { return i18n.t('hr.wizardSteps.compensation'); }, validate: validateCompensation },
  { id: 'schedule', get title() { return i18n.t('hr.wizardSteps.schedule'); }, validate: () => ({}) },
  { id: 'access', get title() { return i18n.t('hr.wizardSteps.access'); }, validate: validateAccess },
];

function mapStaffToWizardData(staff?: Staff): StaffWizardData {
  return {
    name: staff?.name ?? '',
    email: staff?.email ?? '',
    phone: staff?.phone ?? '',
    address: staff?.address ?? '',
    photoUrl: resolveImageUrl(staff?.photoUrl) ?? '',
    photoUri: undefined,
    photoStatus: 'idle',
    role: staff?.role ?? '',
    department: staff?.department ?? '',
    branch: staff?.branch ?? '',
    joinDate: staff?.joinDate ?? '',
    status: staff?.status ?? '',
    salary: staff?.baseSalary ? String(staff.baseSalary) : '',
    monthlyTarget: staff?.monthlyTarget ? String(staff.monthlyTarget) : '',
    certifications: staff?.certifications ?? [],
    schedule: staff?.schedule ?? {},
    username: staff?.appUsername ?? '',
    password: '',
    confirmPassword: '',
    appAccessEnabled: staff?.appAccessEnabled ?? false,
  };
}

function buildCreateRequest(data: StaffWizardData): CreateStaffRequest {
  return {
    name: data.name.trim(),
    email: data.email.trim(),
    phone: data.phone.trim(),
    address: data.address.trim(),
    photoUrl: data.photoUrl || undefined,
    role: data.role,
    department: data.department,
    branch: data.branch,
    joinDate: data.joinDate,
    status: data.status,
    baseSalary: Number(data.salary) || 0,
    monthlyTarget: Number(data.monthlyTarget) || 0,
    certifications: data.certifications,
    schedule: data.schedule,
    appUsername: data.appAccessEnabled ? data.username.trim() : undefined,
    // Blank on edit means "keep the current password".
    appPassword: data.appAccessEnabled && data.password ? data.password : undefined,
  };
}

function buildUpdateRequest(data: StaffWizardData): UpdateStaffRequest {
  return buildCreateRequest(data);
}

interface UseStaffWizardOptions {
  mode: 'create' | 'edit';
  initialData?: Staff;
  staffId?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface UseStaffWizardReturn {
  step: number;
  totalSteps: number;
  currentStep: WizardStep;
  data: StaffWizardData;
  /** Validation messages for the current step. */
  stepErrors: StaffStepErrors;
  /** Validates any step (1-based) against the current data. */
  validateStep: (step: number) => StaffStepErrors;
  canGoNext: boolean;
  canGoPrevious: boolean;
  loading: boolean;
  updateField: <K extends keyof StaffWizardData>(
    field: K,
    value: StaffWizardData[K],
  ) => void;
  next: () => void;
  previous: () => void;
  goToStep: (step: number) => void;
  submit: () => Promise<void>;
  addCertification: () => void;
  removeCertification: (index: number) => void;
  onChangeCert: (index: number, field: keyof StaffCertification, value: string) => void;
}

export function useStaffWizard({
  mode,
  initialData,
  staffId,
  onSuccess,
  onError,
}: UseStaffWizardOptions): UseStaffWizardReturn {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<StaffWizardData>(() =>
    mapStaffToWizardData(initialData),
  );
  const createStaffMutation = useCreateStaff();
  const updateStaffMutation = useUpdateStaff();
  const submitting = createStaffMutation.isPending || updateStaffMutation.isPending;

  const currentStep = STEPS[step - 1];
  const totalSteps = STEPS.length;

  const stepErrors = useMemo(
    () => currentStep.validate(data, mode),
    [currentStep, data, mode],
  );

  const canGoNext = Object.keys(stepErrors).length === 0;

  const validateStep = useCallback(
    (target: number) => STEPS[target - 1]?.validate(data, mode) ?? {},
    [data, mode],
  );

  const canGoPrevious = useMemo(() => step > 1, [step]);

  const updateField = useCallback(
    <K extends keyof StaffWizardData>(field: K, value: StaffWizardData[K]) => {
      setData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const next = useCallback(() => {
    setStep((prev) => Math.min(prev + 1, totalSteps));
  }, [totalSteps]);

  const previous = useCallback(() => {
    setStep((prev) => Math.max(prev - 1, 1));
  }, []);

  const goToStep = useCallback(
    (targetStep: number) => {
      setStep(Math.max(1, Math.min(targetStep, totalSteps)));
    },
    [totalSteps],
  );

  const addCertification = useCallback(() => {
    const newCert: StaffCertification = {
      certName: '',
      issuer: '',
      issueDate: '',
      expiryDate: '',
      documentUrl: '',
    };
    setData((prev) => ({
      ...prev,
      certifications: [...prev.certifications, newCert],
    }));
  }, []);

  const removeCertification = useCallback((index: number) => {
    setData((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index),
    }));
  }, []);

  const onChangeCert = useCallback(
    (index: number, field: keyof StaffCertification, value: string) => {
      setData((prev) => ({
        ...prev,
        certifications: prev.certifications.map((cert, i) =>
          i === index ? { ...cert, [field]: value } : cert,
        ),
      }));
    },
    [],
  );

  const submit = useCallback(async () => {
    try {
      if (mode === 'create') {
        await createStaffMutation.mutateAsync(buildCreateRequest(data));
      } else if (mode === 'edit' && staffId) {
        await updateStaffMutation.mutateAsync({
          id: staffId,
          request: buildUpdateRequest(data),
        });
      }
      onSuccess?.();
    } catch (err) {
      onError?.(err as Error);
    }
  }, [mode, data, staffId, createStaffMutation, updateStaffMutation, onSuccess, onError]);

  return {
    step,
    totalSteps,
    currentStep,
    data,
    stepErrors,
    validateStep,
    canGoNext,
    canGoPrevious,
    loading: submitting,
    updateField,
    next,
    previous,
    goToStep,
    submit,
    addCertification,
    removeCertification,
    onChangeCert,
  };
}

export { STEPS };