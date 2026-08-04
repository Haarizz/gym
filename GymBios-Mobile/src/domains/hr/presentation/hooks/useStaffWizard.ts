import { useCallback, useMemo, useState } from 'react';

import type { Staff, StaffCertification, WeeklySchedule } from '../../domain/Staff';
import type { CreateStaffRequest, UpdateStaffRequest } from '../../application/StaffRepository';
import { useCreateStaff, useUpdateStaff } from './useStaff';

export interface StaffWizardData {
  name: string;
  email: string;
  phone: string;
  address: string;
  photoUrl: string;
  photoUri?: string;
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
  appAccessEnabled: boolean;
}

export interface WizardStep {
  id: string;
  title: string;
  validate: (data: StaffWizardData) => boolean;
}

const STEPS: WizardStep[] = [
  {
    id: 'personal',
    title: 'Personal Information',
    validate: (data) =>
      data.name.trim().length > 0 &&
      data.email.trim().length > 0 &&
      data.phone.trim().length > 0,
  },
  {
    id: 'employment',
    title: 'Employment',
    validate: (data) =>
      data.role.trim().length > 0 &&
      data.department.trim().length > 0 &&
      data.branch.trim().length > 0,
  },
  {
    id: 'compensation',
    title: 'Compensation',
    validate: () => true,
  },
  {
    id: 'schedule',
    title: 'Schedule & Certifications',
    validate: () => true,
  },
  {
    id: 'access',
    title: 'App Access & Review',
    validate: () => true,
  },
];

function mapStaffToWizardData(staff?: Staff): StaffWizardData {
  return {
    name: staff?.name ?? '',
    email: staff?.email ?? '',
    phone: staff?.phone ?? '',
    address: staff?.address ?? '',
    photoUrl: staff?.photoUrl ?? '',
    photoUri: staff?.photoUrl || undefined,
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
    appAccessEnabled: staff?.appAccessEnabled ?? false,
  };
}

function buildCreateRequest(data: StaffWizardData): CreateStaffRequest {
  return {
    name: data.name,
    email: data.email,
    phone: data.phone,
    address: data.address,
    photoUrl: data.photoUri || data.photoUrl || undefined,
    role: data.role,
    department: data.department,
    branch: data.branch,
    joinDate: data.joinDate,
    status: data.status,
    baseSalary: Number(data.salary) || 0,
    monthlyTarget: Number(data.monthlyTarget) || 0,
    certifications: data.certifications,
    schedule: data.schedule,
    appUsername: data.appAccessEnabled ? data.username : undefined,
    appPassword: data.appAccessEnabled ? data.password : undefined,
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

  const canGoNext = useMemo(
    () => currentStep.validate(data),
    [currentStep, data],
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