import { useCallback, useMemo, useState } from 'react';

import type { MembershipPlan } from '../../domain/MembershipPlan';
import type { MembershipPlanRequest } from '../../application/MembershipPlanRepository';
import { MembershipPlanService } from '../../application/MembershipPlanService';
import { ApiMembershipPlanRepository } from '../../infrastructure/ApiMembershipPlanRepository';

const repository = new ApiMembershipPlanRepository();
const planService = new MembershipPlanService(repository);

export interface PlanWizardData {
  // Step 1: Basic Info
  name: string;
  description: string;
  type: string;        // membership type
  planType: string;    // Individual | Family
  status: string;

  // Step 2: Duration & Pricing
  durationType: string;
  durationValue: string;
  price: string;
  discount: string;

  // Step 3: Sessions & Capacity
  maxSessions: string;
  membershipCapacity: string;
  maxCapacity: string;
  attendanceLimit: string;
  attendanceValue: string;
  attendancePeriod: string;

  // Step 4: Family Options (only when planType === 'FAMILY')
  familyBillingMode: string;
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
  planType: 'INDIVIDUAL',
  status: 'ACTIVE',

  durationType: '',
  durationValue: '',
  price: '',
  discount: '0',

  maxSessions: '',
  membershipCapacity: '',
  maxCapacity: '',
  attendanceLimit: '',
  attendanceValue: '',
  attendancePeriod: '',

  familyBillingMode: '',
  pricePerMember: '',
  maxFamilyMembers: '',
  maxAdultMembers: '',
  maxChildMembers: '',
  allowAdditionalMembers: false,
  additionalMemberPrice: '',
  autoCalculateTotal: false,

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

export function mapPlanToWizardData(plan?: MembershipPlan): PlanWizardData {
  if (!plan) return DEFAULT_PLAN_DATA;
  return {
    name: plan.name,
    description: plan.description,
    type: plan.type,
    planType: plan.planType,
    status: plan.status,
    durationType: plan.durationType,
    durationValue: plan.durationValue,
    price: String(plan.price),
    discount: String(plan.discount),
    maxSessions: plan.maxSessions !== undefined ? String(plan.maxSessions) : '',
    membershipCapacity: plan.membershipCapacity ?? '',
    maxCapacity: plan.maxCapacity !== undefined ? String(plan.maxCapacity) : '',
    attendanceLimit: plan.attendanceLimit ?? '',
    attendanceValue: plan.attendanceValue !== undefined ? String(plan.attendanceValue) : '',
    attendancePeriod: plan.attendancePeriod ?? '',
    familyBillingMode: plan.familyBillingMode ?? '',
    pricePerMember: plan.pricePerMember !== undefined ? String(plan.pricePerMember) : '',
    maxFamilyMembers: plan.maxFamilyMembers !== undefined ? String(plan.maxFamilyMembers) : '',
    maxAdultMembers: plan.maxAdultMembers !== undefined ? String(plan.maxAdultMembers) : '',
    maxChildMembers: plan.maxChildMembers !== undefined ? String(plan.maxChildMembers) : '',
    allowAdditionalMembers: plan.allowAdditionalMembers ?? false,
    additionalMemberPrice: plan.additionalMemberPrice !== undefined ? String(plan.additionalMemberPrice) : '',
    autoCalculateTotal: plan.autoCalculateTotal ?? false,
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
  return {
    name: data.name,
    type: data.type,
    planType: data.planType,
    durationType: data.durationType,
    durationValue: data.durationValue,
    price: Number(data.price) || 0,
    discount: Number(data.discount) || 0,
    status: data.status,
    description: data.description,
    maxSessions: data.maxSessions ? Number(data.maxSessions) : undefined,
    membershipCapacity: data.membershipCapacity || undefined,
    maxCapacity: data.maxCapacity ? Number(data.maxCapacity) : undefined,
    attendanceLimit: data.attendanceLimit || undefined,
    attendanceValue: data.attendanceValue ? Number(data.attendanceValue) : undefined,
    attendancePeriod: data.attendancePeriod || undefined,
    familyBillingMode: data.planType === 'FAMILY' ? data.familyBillingMode || undefined : undefined,
    pricePerMember: data.planType === 'FAMILY' && data.pricePerMember ? Number(data.pricePerMember) : undefined,
    maxFamilyMembers: data.planType === 'FAMILY' && data.maxFamilyMembers ? Number(data.maxFamilyMembers) : undefined,
    maxAdultMembers: data.planType === 'FAMILY' && data.maxAdultMembers ? Number(data.maxAdultMembers) : undefined,
    maxChildMembers: data.planType === 'FAMILY' && data.maxChildMembers ? Number(data.maxChildMembers) : undefined,
    allowAdditionalMembers: data.planType === 'FAMILY' ? data.allowAdditionalMembers : undefined,
    additionalMemberPrice: data.planType === 'FAMILY' && data.additionalMemberPrice ? Number(data.additionalMemberPrice) : undefined,
    autoCalculateTotal: data.planType === 'FAMILY' ? data.autoCalculateTotal : undefined,
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

interface StepDef {
  id: string;
  title: string;
  validate: (data: PlanWizardData) => boolean;
}

function buildSteps(planType: string): StepDef[] {
  const isFamily = planType === 'FAMILY';

  const base: StepDef[] = [
    {
      id: 'basic',
      title: 'Basic Info',
      validate: (d) => d.name.trim().length > 0 && d.planType.trim().length > 0,
    },
    {
      id: 'duration',
      title: 'Pricing',
      validate: (d) => d.durationType.trim().length > 0 && d.price.trim().length > 0,
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
  const [submitting, setSubmitting] = useState(false);

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
      setSubmitting(true);
      const request = buildRequest(data);
      if (mode === 'create') {
        await planService.createPlan(request);
      } else if (mode === 'edit' && planId !== undefined) {
        await planService.updatePlan(planId, request);
      }
      onSuccess?.();
    } catch (err) {
      onError?.(err as Error);
    } finally {
      setSubmitting(false);
    }
  }, [mode, data, planId, onSuccess, onError]);

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
