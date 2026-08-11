import { useCallback, useMemo, useState } from 'react';
import type {
  PromotionCampaignRequest,
  PromotionCampaignResponse,
} from '../../domain/PromotionCampaign';
import {
  useCreatePromotion,
  useUpdatePromotion,
} from '../../hooks/usePromotions';

export interface PromotionFormData {
  // Step 1: Core Info
  name: string;
  type: string;
  status: string;
  description: string;
  category: string;
  isPublic: boolean;
  image: string;

  // Step 2: Validity & Schedule
  startDate: string;
  endDate: string;
  priority: string;

  // Step 3: Discount & Limits
  discountType: string;
  discountValue: string;
  minimumPurchase: string;
  maximumDiscount: string;
  usageLimit: string;
  usageLimitPerMember: string;
  code: string;
  autoApply: boolean;
  stackable: boolean;

  // Step 4: Targeting & Channels
  targetAudience: string;
  applicablePlans: string[];
  applicableServices: string[];
  specificMembers: string[];
  channels: string[];
  tags: string[];

  // Step 5: Policy & Terms
  termsAndConditions: string;
  policyRulesJson: string;
  policyConfigJson: string;
}

export const DEFAULT_PROMOTION_FORM_DATA: PromotionFormData = {
  name: '',
  type: 'discount',
  status: 'draft',
  description: '',
  category: '',
  isPublic: false,
  image: '',

  startDate: '',
  endDate: '',
  priority: '2',

  discountType: 'percentage',
  discountValue: '0',
  minimumPurchase: '',
  maximumDiscount: '',
  usageLimit: '',
  usageLimitPerMember: '',
  code: '',
  autoApply: false,
  stackable: false,

  targetAudience: 'all',
  applicablePlans: [],
  applicableServices: [],
  specificMembers: [],
  channels: [],
  tags: [],

  termsAndConditions: '',
  policyRulesJson: '',
  policyConfigJson: '',
};

export function mapPromotionToFormData(
  promotion?: PromotionCampaignResponse,
): PromotionFormData {
  if (!promotion) return DEFAULT_PROMOTION_FORM_DATA;

  return {
    name: promotion.name,
    type: promotion.type,
    status: promotion.status,
    description: promotion.description ?? '',
    category: promotion.category ?? '',
    isPublic: promotion.isPublic,
    image: promotion.image ?? '',

    startDate: promotion.startDate ?? '',
    endDate: promotion.endDate ?? '',
    priority: promotion.priority !== null && promotion.priority !== undefined ? String(promotion.priority) : '2',

    discountType: promotion.discountType ?? 'percentage',
    discountValue: promotion.discountValue !== undefined ? String(promotion.discountValue) : '0',
    minimumPurchase: promotion.minimumPurchase !== null && promotion.minimumPurchase !== undefined ? String(promotion.minimumPurchase) : '',
    maximumDiscount: promotion.maximumDiscount !== null && promotion.maximumDiscount !== undefined ? String(promotion.maximumDiscount) : '',
    usageLimit: promotion.usageLimit !== null && promotion.usageLimit !== undefined ? String(promotion.usageLimit) : '',
    usageLimitPerMember: promotion.usageLimitPerMember !== null && promotion.usageLimitPerMember !== undefined ? String(promotion.usageLimitPerMember) : '',
    code: promotion.code ?? '',
    autoApply: promotion.autoApply,
    stackable: promotion.stackable,

    targetAudience: promotion.targetAudience ?? 'all',
    applicablePlans: promotion.applicablePlans ?? [],
    applicableServices: promotion.applicableServices ?? [],
    specificMembers: promotion.specificMembers ?? [],
    channels: promotion.channels ?? [],
    tags: promotion.tags ?? [],

    termsAndConditions: promotion.termsAndConditions ?? '',
    policyRulesJson: promotion.policyRulesJson ?? '',
    policyConfigJson: promotion.policyConfigJson ?? '',
  };
}

export function buildPromotionRequest(data: PromotionFormData): PromotionCampaignRequest {
  return {
    name: data.name.trim(),
    type: data.type.trim(),
    status: data.status.trim() || undefined,
    description: data.description.trim() || undefined,
    category: data.category.trim() || undefined,
    isPublic: data.isPublic,
    image: data.image.trim() || undefined,

    startDate: data.startDate.trim() || undefined,
    endDate: data.endDate.trim() || undefined,
    priority: data.priority ? Number(data.priority) : undefined,

    discountType: data.discountType.trim() || undefined,
    discountValue: data.discountValue ? Number(data.discountValue) : 0,
    minimumPurchase: data.minimumPurchase ? Number(data.minimumPurchase) : undefined,
    maximumDiscount: data.maximumDiscount ? Number(data.maximumDiscount) : undefined,
    usageLimit: data.usageLimit ? Number(data.usageLimit) : undefined,
    usageLimitPerMember: data.usageLimitPerMember ? Number(data.usageLimitPerMember) : undefined,
    code: data.code.trim() || undefined,
    autoApply: data.autoApply,
    stackable: data.stackable,

    targetAudience: data.targetAudience.trim() || undefined,
    applicablePlans: data.applicablePlans,
    applicableServices: data.applicableServices,
    specificMembers: data.specificMembers,
    channels: data.channels,
    tags: data.tags,

    termsAndConditions: data.termsAndConditions.trim() || undefined,
    policyRulesJson: data.policyRulesJson.trim() || undefined,
    policyConfigJson: data.policyConfigJson.trim() || undefined,
  };
}

export interface PromotionWizardStep {
  id: string;
  title: string;
  validate: (data: PromotionFormData) => boolean;
}

export const PROMOTION_WIZARD_STEPS: PromotionWizardStep[] = [
  {
    id: 'core',
    title: 'Core Info',
    validate: (d) => d.name.trim().length > 0 && d.type.trim().length > 0,
  },
  {
    id: 'schedule',
    title: 'Validity & Schedule',
    validate: () => true,
  },
  {
    id: 'discount',
    title: 'Discount & Limits',
    validate: () => true,
  },
  {
    id: 'targeting',
    title: 'Targeting & Channels',
    validate: () => true,
  },
  {
    id: 'policy',
    title: 'Policy & Terms',
    validate: () => true,
  },
];

export interface UsePromotionWizardOptions {
  mode: 'create' | 'edit';
  initialData?: PromotionCampaignResponse;
  promotionId?: number;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function usePromotionWizard({
  mode,
  initialData,
  promotionId,
  onSuccess,
  onError,
}: UsePromotionWizardOptions) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<PromotionFormData>(() =>
    mapPromotionToFormData(initialData),
  );

  const createMutation = useCreatePromotion();
  const updateMutation = useUpdatePromotion();

  const submitting = createMutation.isPending || updateMutation.isPending;
  const totalSteps = PROMOTION_WIZARD_STEPS.length;
  const currentStep = PROMOTION_WIZARD_STEPS[step - 1];

  const canGoNext = useMemo(
    () => currentStep?.validate(data) ?? false,
    [currentStep, data],
  );

  const canGoPrevious = useMemo(() => step > 1, [step]);

  const updateField = useCallback(
    <K extends keyof PromotionFormData>(field: K, value: PromotionFormData[K]) => {
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

  const submit = useCallback(async () => {
    try {
      const request = buildPromotionRequest(data);
      if (mode === 'create') {
        await createMutation.mutateAsync(request);
      } else if (mode === 'edit' && promotionId !== undefined) {
        await updateMutation.mutateAsync({ id: promotionId, request });
      }
      onSuccess?.();
    } catch (err) {
      onError?.(err as Error);
    }
  }, [mode, data, promotionId, createMutation, updateMutation, onSuccess, onError]);

  return {
    step,
    totalSteps,
    steps: PROMOTION_WIZARD_STEPS,
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
  };
}
