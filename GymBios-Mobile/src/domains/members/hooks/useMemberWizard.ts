import { useCallback, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';

import type { PaymentResult } from '@/shared/payment';
import type { Member } from '../domain/Member';
import type {
  CreateMemberRequest,
  UpdateMemberRequest,
} from '../application/directory/MemberDirectoryRepository';
import { useMemberActions } from './useMemberActions';
import { useBranchContext } from '@/shared/providers/BranchProvider';

export interface DraftFamilyMember {
  name: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  gender?: string;
  relationship: string;
}

export interface MemberWizardData {
  // Step 1: Personal
  name: string;
  gender: string;
  dateOfBirth: Date | null;
  nationality: string;
  phone: string;
  email: string;
  address: string;
  photoUrl: string;
  photoUri?: string;

  // Step 2: Membership
  membershipType: string;
  membershipPlanId: string;
  status: string;
  joinDate: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  monthlyFee: string;
  membershipFee: string;
  paymentStatus: string;
  discount: string;

  // Step 3: Medical
  bloodGroup: string;
  height: string;
  weight: string;
  medicalConditions: string;
  chronicIllnesses: string;
  allergies: string;
  currentMedications: string;
  healthNotes: string;

  // Step 4: Family
  isFamilyHead: boolean;
  relationshipToHead: string;
  familyMembers: DraftFamilyMember[];

  // Step 5: Access
  appAccessEnabled: boolean;
  username: string;
  password: string;
  confirmPassword: string;
}

export interface WizardStep {
  id: string;
  title: string;
  validate: (data: MemberWizardData) => boolean;
}

export const STEPS: WizardStep[] = [
  {
    id: 'personal',
    title: 'Personal Information',
    validate: (data) =>
      data.name.trim().length > 0 && data.phone.trim().length > 0,
  },
  {
    id: 'membership',
    title: 'Membership Information',
    validate: (data) =>
      data.membershipType.trim().length > 0 &&
      data.membershipPlanId.trim().length > 0,
  },
  {
    id: 'medical',
    title: 'Medical Information',
    validate: () => true,
  },
  {
    id: 'family',
    title: 'Family Configuration',
    validate: () => true,
  },
  {
    id: 'access',
    title: 'App Access & Review',
    validate: (data) => {
      if (!data.appAccessEnabled) return true;
      return (
        data.username.trim().length > 0 &&
        data.password.length > 0 &&
        data.password === data.confirmPassword
      );
    },
  },
];

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  try {
    const parsed = parseISO(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

const today = () => new Date();

function mapMemberToWizardData(member?: Member): MemberWizardData {
  const todayDate = today();
  return {
    name: member?.name ?? '',
    gender: member?.gender ?? '',
    dateOfBirth: parseDate(member?.dateOfBirth),
    nationality: '',
    phone: member?.phone ?? '',
    email: member?.email ?? '',
    address: member?.address ?? '',
    photoUrl: member?.photoUrl ?? '',
    photoUri: member?.photoUrl || undefined,

    membershipType: member?.membershipType ?? '',
    membershipPlanId: member?.membershipPlanId
      ? String(member.membershipPlanId)
      : '',
    status: member?.status ?? 'ACTIVE',
    joinDate: parseDate(member?.startDate) ?? todayDate,
    startDate: parseDate(member?.startDate) ?? todayDate,
    endDate: parseDate(member?.endDate),
    monthlyFee: '',
    membershipFee: member?.membershipPlanPrice
      ? String(member.membershipPlanPrice)
      : '',
    paymentStatus: member?.paymentStatus ?? 'PAID',
    discount: '',

    bloodGroup: member?.bloodGroup ?? '',
    height: member?.height ?? '',
    weight: member?.weight ?? '',
    medicalConditions: member?.medicalConditions ?? '',
    chronicIllnesses: member?.chronicIllnesses ?? '',
    allergies: member?.allergies ?? '',
    currentMedications: member?.currentMedications ?? '',
    healthNotes: member?.healthNotes ?? '',

    isFamilyHead: member?.familyHeadId === undefined,
    relationshipToHead: member?.familyRole ?? 'SPOUSE',
    familyMembers: [],

    appAccessEnabled: member?.appAccessEnabled ?? false,
    username: member?.appUsername ?? '',
    password: '',
    confirmPassword: '',
  };
}

function formatDateStr(d: Date | null): string | undefined {
  if (!d) return undefined;
  return format(d, 'yyyy-MM-dd');
}

function buildCreateRequest(
  data: MemberWizardData,
  paymentResult?: PaymentResult,
): CreateMemberRequest {
  const startDateStr =
    formatDateStr(data.startDate) ||
    formatDateStr(data.joinDate) ||
    format(new Date(), 'yyyy-MM-dd');

  return {
    name: data.name,
    email: data.email,
    phone: data.phone,
    dateOfBirth: formatDateStr(data.dateOfBirth),
    gender: data.gender || undefined,
    photoUrl: data.photoUri || data.photoUrl || undefined,
    address: data.address || undefined,
    membershipType: data.membershipType,
    membershipPlanId: data.membershipPlanId
      ? Number(data.membershipPlanId)
      : undefined,
    status: data.status || 'ACTIVE',
    startDate: startDateStr,
    paymentStatus: paymentResult?.paymentStatus || data.paymentStatus || 'PENDING',
    paymentMethodUsed: paymentResult?.paymentMethodUsed,
    paymentBreakdown: paymentResult?.paymentBreakdown,
    discountApplied: paymentResult?.discountApplied,
    outstandingBalance: paymentResult?.outstandingBalance,
    bankAccountCode: paymentResult?.bankAccountCode,
    bankAccountName: paymentResult?.bankAccountName,

    bloodGroup: data.bloodGroup || undefined,
    height: data.height || undefined,
    weight: data.weight || undefined,
    medicalConditions: data.medicalConditions || undefined,
    chronicIllnesses: data.chronicIllnesses || undefined,
    allergies: data.allergies || undefined,
    currentMedications: data.currentMedications || undefined,
    healthNotes: data.healthNotes || undefined,

    appAccessEnabled: data.appAccessEnabled,
    appUsername: data.appAccessEnabled ? data.username : undefined,
    appPassword: data.appAccessEnabled ? data.password : undefined,

    isFamilyHead: data.isFamilyHead,
    relationshipToHead: data.isFamilyHead ? undefined : data.relationshipToHead,
    familyMembers: data.isFamilyHead ? data.familyMembers : undefined,
  };
}

function buildUpdateRequest(data: MemberWizardData): UpdateMemberRequest {
  const base = buildCreateRequest(data);
  return {
    ...base,
    endDate: formatDateStr(data.endDate),
  };
}

interface UseMemberWizardOptions {
  mode: 'create' | 'edit';
  initialData?: Member;
  memberId?: number;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export interface UseMemberWizardReturn {
  step: number;
  totalSteps: number;
  currentStep: WizardStep;
  data: MemberWizardData;
  canGoNext: boolean;
  canGoPrevious: boolean;
  loading: boolean;
  updateField: <K extends keyof MemberWizardData>(
    field: K,
    value: MemberWizardData[K],
  ) => void;
  next: () => void;
  previous: () => void;
  goToStep: (step: number) => void;
  submit: (paymentResult?: PaymentResult) => Promise<void>;
  addFamilyMember: (member: DraftFamilyMember) => void;
  removeFamilyMember: (index: number) => void;
}

export function useMemberWizard({
  mode,
  initialData,
  memberId,
  onSuccess,
  onError,
}: UseMemberWizardOptions): UseMemberWizardReturn {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<MemberWizardData>(() =>
    mapMemberToWizardData(initialData),
  );
  const { createMember, updateMember, submitting } = useMemberActions();
  const { selectedBranchId } = useBranchContext();

  const currentStep = STEPS[step - 1];
  const totalSteps = STEPS.length;

  const canGoNext = useMemo(
    () => currentStep.validate(data),
    [currentStep, data],
  );

  const canGoPrevious = useMemo(() => step > 1, [step]);

  const updateField = useCallback(
    <K extends keyof MemberWizardData>(field: K, value: MemberWizardData[K]) => {
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

  const addFamilyMember = useCallback((member: DraftFamilyMember) => {
    setData((prev) => ({
      ...prev,
      familyMembers: [...prev.familyMembers, member],
    }));
  }, []);

  const removeFamilyMember = useCallback((index: number) => {
    setData((prev) => ({
      ...prev,
      familyMembers: prev.familyMembers.filter((_, i) => i !== index),
    }));
  }, []);

  const submit = useCallback(
    async (paymentResult?: PaymentResult) => {
      try {
        if (mode === 'create') {
          const request = buildCreateRequest(data, paymentResult);
          if (selectedBranchId && selectedBranchId !== 'ALL') {
            request.branchId = selectedBranchId;
          }
          await createMember(request);
        } else if (mode === 'edit' && memberId) {
          const request = buildUpdateRequest(data);
          if (selectedBranchId && selectedBranchId !== 'ALL') {
            request.branchId = selectedBranchId;
          }
          await updateMember(memberId, request);
        }
        onSuccess?.();
      } catch (err) {
        onError?.(err as Error);
      }
    },
    [mode, data, memberId, createMember, updateMember, onSuccess, onError, selectedBranchId],
  );

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
    addFamilyMember,
    removeFamilyMember,
  };
}
