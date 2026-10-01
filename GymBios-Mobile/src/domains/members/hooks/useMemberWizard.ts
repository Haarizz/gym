import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { addDays, addMonths, addYears, format, isBefore, parseISO, startOfDay } from 'date-fns';

import type { PaymentResult } from '@/shared/payment';
import type { Member } from '../domain/Member';
import type {
  CreateMemberRequest,
  UpdateMemberRequest,
} from '../application/directory/MemberDirectoryRepository';
import { useMemberActions } from './useMemberActions';
import { useBranchContext } from '@/shared/providers/BranchProvider';
import { resolveImageUrl } from '@/shared/utils/resolveImageUrl';
import { leadKeys } from '@/domains/leads/hooks/leadKeys';
import { performanceKeys } from '@/domains/performance/hooks/useStaffPerformance';

/** Contact details carried over when a converted lead is registered as a member. */
export interface MemberPrefill {
  leadId?: number;
  name?: string;
  email?: string;
  phone?: string;
  /** The lead's assigned staff name — preselected as "Processed By". */
  assignedStaff?: string;
}

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
  /** Upload state of photoUri — submit is blocked while 'uploading'. */
  photoStatus: 'idle' | 'uploading' | 'error';

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
  /** Staff DB id credited with this sale toward their revenue target ('' = none). */
  processedByStaffId: string;

  // Source lead (create from a converted lead only)
  leadId: number | null;
  leadAssignedStaff: string;

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

export type WizardMode = 'create' | 'edit';

/** Field-level validation messages, keyed by the wizard field they belong to. */
export type StepErrors = Partial<Record<keyof MemberWizardData, string>>;

export interface WizardStep {
  id: string;
  title: string;
  validate: (data: MemberWizardData, mode: WizardMode) => StepErrors;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9\s\-()]{7,20}$/;
const MIN_PASSWORD_LENGTH = 6;

function validatePersonal(data: MemberWizardData): StepErrors {
  const errors: StepErrors = {};
  if (data.name.trim().length < 2) errors.name = 'Enter the member\'s full name';

  const phone = data.phone.trim();
  if (!phone) errors.phone = 'Phone number is required';
  else if (!PHONE_PATTERN.test(phone) || phone.replace(/\D/g, '').length < 7) {
    errors.phone = 'Enter a valid phone number';
  }

  const email = data.email.trim();
  if (email && !EMAIL_PATTERN.test(email)) errors.email = 'Enter a valid email address';

  if (data.photoStatus === 'uploading') errors.photoUrl = 'Wait for the photo to finish uploading';
  return errors;
}

function validateMembership(data: MemberWizardData, mode: WizardMode): StepErrors {
  const errors: StepErrors = {};
  if (!data.membershipType.trim()) errors.membershipType = 'Choose a membership type';
  if (!data.membershipPlanId.trim()) errors.membershipPlanId = 'Choose a membership plan';

  const today = startOfDay(new Date());
  if (!data.joinDate) {
    errors.joinDate = 'Joining date is required';
  } else if (mode === 'create' && isBefore(startOfDay(data.joinDate), today)) {
    // Existing members keep their historical join date; new ones can't be backdated.
    errors.joinDate = 'Joining date can\'t be in the past';
  }

  if (!data.startDate) {
    errors.startDate = 'Start date is required';
  } else if (mode === 'create' && isBefore(startOfDay(data.startDate), today)) {
    errors.startDate = 'Start date can\'t be in the past';
  } else if (data.joinDate && isBefore(startOfDay(data.startDate), startOfDay(data.joinDate))) {
    errors.startDate = 'Start date can\'t be before the joining date';
  }
  return errors;
}

function validateAccess(data: MemberWizardData, mode: WizardMode): StepErrors {
  const errors: StepErrors = {};
  if (!data.appAccessEnabled) return errors;

  const username = data.username.trim();
  if (!username) errors.username = 'Username is required';
  else if (/\s/.test(username)) errors.username = 'Username can\'t contain spaces';
  else if (username.length < 3) errors.username = 'Username must be at least 3 characters';

  // The backend only sets credentials on registration, so an existing login
  // can be left alone when editing.
  const passwordOptional = mode === 'edit';
  if (!data.password) {
    if (!passwordOptional) errors.password = 'Password is required';
  } else if (data.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if ((data.password || data.confirmPassword) && data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Passwords don\'t match';
  }
  return errors;
}

export const STEPS: WizardStep[] = [
  { id: 'personal', title: 'Personal Information', validate: validatePersonal },
  { id: 'membership', title: 'Membership Information', validate: validateMembership },
  { id: 'medical', title: 'Medical Information', validate: () => ({}) },
  { id: 'family', title: 'Family Configuration', validate: () => ({}) },
  { id: 'access', title: 'App Access & Review', validate: validateAccess },
];

/** Membership end date for a plan starting on `start`, or null if the duration is unknown. */
export function computeEndDate(
  start: Date,
  durationValue: string | number | undefined,
  durationType: string | undefined,
): Date | null {
  const value = parseInt(String(durationValue ?? ''), 10);
  if (isNaN(value)) return null;
  const type = durationType?.toLowerCase() ?? '';
  if (type === 'month' || type === 'months') return addMonths(start, value);
  if (type === 'year' || type === 'years') return addYears(start, value);
  if (type === 'day' || type === 'days') return addDays(start, value);
  if (type === 'week' || type === 'weeks') return addDays(start, value * 7);
  return null;
}

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

function mapMemberToWizardData(member?: Member, prefill?: MemberPrefill): MemberWizardData {
  const todayDate = today();
  return {
    name: member?.name ?? prefill?.name ?? '',
    gender: member?.gender ?? '',
    dateOfBirth: parseDate(member?.dateOfBirth),
    nationality: '',
    phone: member?.phone ?? prefill?.phone ?? '',
    email: member?.email ?? prefill?.email ?? '',
    address: member?.address ?? '',
    photoUrl: resolveImageUrl(member?.photoUrl) ?? '',
    photoUri: undefined,
    photoStatus: 'idle',

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
    processedByStaffId: '',

    leadId: prefill?.leadId ?? null,
    leadAssignedStaff: prefill?.assignedStaff ?? '',

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
    photoUrl: data.photoUrl || undefined,
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
    processedByStaffId: data.processedByStaffId ? Number(data.processedByStaffId) : undefined,
    leadId: data.leadId ?? undefined,

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
  // Sale credit and lead linking only apply when the member is first registered.
  const { processedByStaffId: _processedBy, leadId: _leadId, ...base } = buildCreateRequest(data);
  return {
    ...base,
    endDate: formatDateStr(data.endDate),
  };
}

interface UseMemberWizardOptions {
  mode: WizardMode;
  initialData?: Member;
  memberId?: number;
  prefill?: MemberPrefill;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export interface UseMemberWizardReturn {
  step: number;
  totalSteps: number;
  currentStep: WizardStep;
  data: MemberWizardData;
  /** Validation messages for the current step (empty when it's valid). */
  stepErrors: StepErrors;
  /** Validation messages for any step, e.g. to flag steps on the review screen. */
  validateStep: (step: number) => StepErrors;
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
  prefill,
  onSuccess,
  onError,
}: UseMemberWizardOptions): UseMemberWizardReturn {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<MemberWizardData>(() =>
    mapMemberToWizardData(initialData, mode === 'create' ? prefill : undefined),
  );
  const queryClient = useQueryClient();
  const { createMember, updateMember, submitting } = useMemberActions();
  const { selectedBranchId } = useBranchContext();

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
          if (request.leadId) {
            // The backend marked the lead converted and credited the sale to a staff member.
            queryClient.invalidateQueries({ queryKey: leadKeys.all });
            queryClient.invalidateQueries({ queryKey: performanceKeys.all });
          }
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
    [mode, data, memberId, createMember, updateMember, onSuccess, onError, selectedBranchId, queryClient],
  );

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
    addFamilyMember,
    removeFamilyMember,
  };
}
