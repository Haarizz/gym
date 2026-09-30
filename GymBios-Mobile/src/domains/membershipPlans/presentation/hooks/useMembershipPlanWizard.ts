import { useCallback, useMemo, useState } from 'react';

import type { MembershipPlan } from '../../domain/MembershipPlan';
import type { MembershipPlanRequest } from '../../application/MembershipPlanRepository';
import { useCreatePlan, useUpdatePlan } from './useMembershipPlans';

export interface PlanWizardData {
  // Step 1: Basic Info
  name: string;
  description: string;
  type: string;        // membership type
  planType: string;    // Individual | Couple | Family | Corporate | Walk-In (same values as the web app)
  status: string;

  // Step 2: Duration & Pricing
  durationType: string;
  durationValue: string;
  price: string;
  discount: string; // legacy, passed through untouched
  offerType: 'none' | 'percentage' | 'fixed';
  offerValue: string;
  offerLabel: string;
  offerStartDate: string; // yyyy-MM-dd or ''
  offerEndDate: string;   // yyyy-MM-dd or ''

  // Step 3: Sessions & Capacity
  maxSessions: string;
  membershipCapacity: string;
  maxCapacity: string;
  attendanceLimit: string;
  attendanceValue: string;
  attendancePeriod: string;

  // Step 4: Family Options (Family and Couple plans only)
  familyBillingMode: string; // 'individual' | 'family_head' — the values the backend bills by
  pricePerMember: string;
  maxFamilyMembers: string;
  maxAdultMembers: string;
  maxChildMembers: string;
  allowAdditionalMembers: boolean;
  additionalMemberPrice: string;
  autoCalculateTotal: boolean;

  // Step 5: Freeze Policy
  maxFreezeDays: string;
  maxFreezeOccurrences: string;
  chargePerExtraDay: string;
  freeDaysAllowed: string;
  autoUnfreeze: boolean;

  // Step 6: Assignments
  assignableTrainers: string[];
  trainingStreams: number[];
  selectedFacilities: string[];
  selectedPromotions: number[];
  selectedCampaigns: number[];
}

export const DEFAULT_PLAN_DATA: PlanWizardData = {
  name: '',
  description: '',
  type: '',
  planType: 'Individual',
  status: 'ACTIVE',

  durationType: '',
  durationValue: '',
  price: '',
  discount: '0',
  offerType: 'none',
  offerValue: '',
  offerLabel: '',
  offerStartDate: '',
  offerEndDate: '',

  maxSessions: '',
  membershipCapacity: '',
  maxCapacity: '',
  attendanceLimit: '',
  attendanceValue: '',
  attendancePeriod: '',

  // Same defaults as the web app's plan form.
  familyBillingMode: 'individual',
  pricePerMember: '',
  maxFamilyMembers: '',
  maxAdultMembers: '',
  maxChildMembers: '',
  allowAdditionalMembers: false,
  additionalMemberPrice: '',
  autoCalculateTotal: true,

  maxFreezeDays: '',
  maxFreezeOccurrences: '',
  chargePerExtraDay: '',
  freeDaysAllowed: '',
  autoUnfreeze: false,

  assignableTrainers: [],
  trainingStreams: [],
  selectedFacilities: [],
  selectedPromotions: [],
  selectedCampaigns: [],
};

export const PLAN_TYPES = ['Individual', 'Couple', 'Family', 'Corporate', 'Walk-In'];

/** Plans saved by older app builds used 'FAMILY' / 'INDIVIDUAL'; the web app uses 'Family'. */
function normalizePlanType(planType?: string): string {
  return PLAN_TYPES.find((t) => t.toLowerCase() === planType?.toLowerCase()) ?? planType ?? 'Individual';
}

export function isFamilyPlanType(planType: string): boolean {
  return planType === 'Family' || planType === 'Couple';
}

export function mapPlanToWizardData(plan?: MembershipPlan): PlanWizardData {
  if (!plan) return DEFAULT_PLAN_DATA;
  return {
    name: plan.name,
    description: plan.description,
    type: plan.type,
    planType: normalizePlanType(plan.planType),
    status: plan.status,
    durationType: plan.durationType,
    durationValue: plan.durationValue,
    price: String(plan.price),
    discount: String(plan.discount ?? 0),
    offerType: plan.offerType ?? 'none',
    offerValue: plan.offerValue != null ? String(plan.offerValue) : '',
    offerLabel: plan.offerLabel ?? '',
    offerStartDate: plan.offerStartDate ?? '',
    offerEndDate: plan.offerEndDate ?? '',
    maxSessions: plan.maxSessions !== undefined ? String(plan.maxSessions) : '',
    membershipCapacity: plan.membershipCapacity ?? '',
    maxCapacity: plan.maxCapacity !== undefined ? String(plan.maxCapacity) : '',
    attendanceLimit: plan.attendanceLimit ?? '',
    attendanceValue: plan.attendanceValue !== undefined ? String(plan.attendanceValue) : '',
    attendancePeriod: plan.attendancePeriod ?? '',
    // Anything but 'family_head' (incl. older app builds' 'Per Family' etc.) is billed individually.
    familyBillingMode: plan.familyBillingMode === 'family_head' ? 'family_head' : 'individual',
    pricePerMember: plan.pricePerMember !== undefined ? String(plan.pricePerMember) : '',
    maxFamilyMembers: plan.maxFamilyMembers !== undefined ? String(plan.maxFamilyMembers) : '',
    maxAdultMembers: plan.maxAdultMembers !== undefined ? String(plan.maxAdultMembers) : '',
    maxChildMembers: plan.maxChildMembers !== undefined ? String(plan.maxChildMembers) : '',
    allowAdditionalMembers: plan.allowAdditionalMembers ?? false,
    additionalMemberPrice: plan.additionalMemberPrice !== undefined ? String(plan.additionalMemberPrice) : '',
    autoCalculateTotal: plan.autoCalculateTotal ?? true,
    maxFreezeDays: plan.maxFreezeDays !== undefined ? String(plan.maxFreezeDays) : '',
    maxFreezeOccurrences: plan.maxFreezeOccurrences !== undefined ? String(plan.maxFreezeOccurrences) : '',
    chargePerExtraDay: plan.chargePerExtraDay !== undefined ? String(plan.chargePerExtraDay) : '',
    freeDaysAllowed: plan.freeDaysAllowed !== undefined ? String(plan.freeDaysAllowed) : '',
    autoUnfreeze: plan.autoUnfreeze ?? false,
    assignableTrainers: plan.assignableTrainers,
    trainingStreams: plan.trainingStreams,
    selectedFacilities: plan.selectedFacilities,
    selectedPromotions: plan.selectedPromotions,
    selectedCampaigns: plan.selectedCampaigns,
  };
}

function buildRequest(data: PlanWizardData): MembershipPlanRequest {
  const isFamily = isFamilyPlanType(data.planType);
  // Member caps / additional members only apply to Family — a Couple is always two.
  const isFamilyOnly = data.planType === 'Family';
  return {
    name: data.name,
    type: data.type,
    planType: data.planType,
    durationType: data.durationType,
    durationValue: data.durationValue,
    price: Number(data.price) || 0,
    discount: Number(data.discount) || 0,
    ...(data.offerType === 'none'
      ? { offerType: '' as const }
      : {
          offerType: data.offerType,
          offerValue: Number(data.offerValue) || 0,
          offerLabel: data.offerLabel.trim(),
          offerStartDate: data.offerStartDate,
          offerEndDate: data.offerEndDate,
        }),
    status: data.status,
    description: data.description,
    maxSessions: data.maxSessions ? Number(data.maxSessions) : undefined,
    membershipCapacity: data.membershipCapacity || undefined,
    maxCapacity: data.maxCapacity ? Number(data.maxCapacity) : undefined,
    attendanceLimit: data.attendanceLimit || undefined,
    attendanceValue: data.attendanceValue ? Number(data.attendanceValue) : undefined,
    attendancePeriod: data.attendancePeriod || undefined,
    familyBillingMode: isFamily ? data.familyBillingMode || 'individual' : undefined,
    pricePerMember: isFamily && data.pricePerMember ? Number(data.pricePerMember) : undefined,
    maxFamilyMembers: isFamilyOnly && data.maxFamilyMembers ? Number(data.maxFamilyMembers) : undefined,
    maxAdultMembers: isFamilyOnly && data.maxAdultMembers ? Number(data.maxAdultMembers) : undefined,
    maxChildMembers: isFamilyOnly && data.maxChildMembers ? Number(data.maxChildMembers) : undefined,
    allowAdditionalMembers: isFamilyOnly ? data.allowAdditionalMembers : undefined,
    additionalMemberPrice: isFamilyOnly && data.additionalMemberPrice ? Number(data.additionalMemberPrice) : undefined,
    autoCalculateTotal: isFamily ? data.autoCalculateTotal : undefined,
    maxFreezeDays: data.maxFreezeDays ? Number(data.maxFreezeDays) : undefined,
    maxFreezeOccurrences: data.maxFreezeOccurrences ? Number(data.maxFreezeOccurrences) : undefined,
    chargePerExtraDay: data.chargePerExtraDay ? Number(data.chargePerExtraDay) : undefined,
    freeDaysAllowed: data.freeDaysAllowed ? Number(data.freeDaysAllowed) : undefined,
    autoUnfreeze: data.autoUnfreeze,
    assignableTrainers: data.assignableTrainers,
    trainingStreams: data.trainingStreams,
    selectedFacilities: data.selectedFacilities,
    selectedPromotions: data.selectedPromotions,
    selectedCampaigns: data.selectedCampaigns,
  };
}

/** Why the offer can't be saved as entered, or null when it's fine (or there is none). */
export function offerError(d: PlanWizardData): string | null {
  if (d.offerType === 'none') return null;
  const value = Number(d.offerValue);
  if (!d.offerValue.trim() || !(value > 0)) return 'Enter an offer value greater than 0';
  if (d.offerType === 'percentage' && value > 100) return "A percentage offer can't be more than 100%";
  if (d.offerStartDate && d.offerEndDate && d.offerEndDate < d.offerStartDate) {
    return "The end date can't be before the start date";
  }
  return null;
}

interface StepDef {
  id: string;
  title: string;
  validate: (data: PlanWizardData) => boolean;
}

function buildSteps(planType: string): StepDef[] {
  const isFamily = isFamilyPlanType(planType);

  const base: StepDef[] = [
    {
      id: 'basic',
      title: 'Basic Info',
      validate: (d) => d.name.trim().length > 0 && d.planType.trim().length > 0,
    },
    {
      id: 'duration',
      title: 'Pricing',
      validate: (d) => d.durationType.trim().length > 0 && d.price.trim().length > 0 && !offerError(d),
    },
    {
      id: 'sessions',
      title: 'Capacity',
      validate: () => true,
    },
  ];

  if (isFamily) {
    base.push({
      id: 'family',
      title: 'Family',
      validate: () => true,
    });
  }

  base.push(
    {
      id: 'freeze',
      title: 'Freeze',
      validate: () => true,
    },
    {
      id: 'assignments',
      title: 'Assign',
      validate: () => true,
    },
  );

  return base;
}

interface UseMembershipPlanWizardOptions {
  mode: 'create' | 'edit';
  initialData?: MembershipPlan;
  planId?: number;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useMembershipPlanWizard({
  mode,
  initialData,
  planId,
  onSuccess,
  onError,
}: UseMembershipPlanWizardOptions) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<PlanWizardData>(() =>
    mapPlanToWizardData(initialData),
  );
  const createPlanMutation = useCreatePlan();
  const updatePlanMutation = useUpdatePlan();
  const submitting = createPlanMutation.isPending || updatePlanMutation.isPending;

  const steps = useMemo(() => buildSteps(data.planType), [data.planType]);
  const totalSteps = steps.length;
  const currentStep = steps[step - 1];

  const canGoNext = useMemo(
    () => currentStep?.validate(data) ?? false,
    [currentStep, data],
  );

  const updateField = useCallback(
    <K extends keyof PlanWizardData>(field: K, value: PlanWizardData[K]) => {
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

  const submit = useCallback(async () => {
    try {
      const request = buildRequest(data);
      if (mode === 'create') {
        await createPlanMutation.mutateAsync(request);
      } else if (mode === 'edit' && planId !== undefined) {
        await updatePlanMutation.mutateAsync({ id: planId, request });
      }
      onSuccess?.();
    } catch (err) {
      onError?.(err as Error);
    }
  }, [mode, data, planId, createPlanMutation, updatePlanMutation, onSuccess, onError]);

  return {
    step,
    totalSteps,
    steps,
    currentStep,
    data,
    canGoNext,
    loading: submitting,
    updateField,
    next,
    previous,
    submit,
  };
}
