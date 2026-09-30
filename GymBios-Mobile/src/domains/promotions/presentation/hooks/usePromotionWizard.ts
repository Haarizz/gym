import { useCallback, useMemo, useState } from 'react';
import { format } from 'date-fns';
import type {
  PromotionCampaignRequest,
  PromotionCampaignResponse,
} from '../../domain/PromotionCampaign';
import {
  useCreatePromotion,
  useUpdatePromotion,
} from '../../hooks/usePromotions';

export const PROMO_ACCESS_DAYS = 'promotional-access-days';

export function isAccessDaysPromotion(data: Pick<PromotionFormData, 'type' | 'discountType'>): boolean {
  return data.type === PROMO_ACCESS_DAYS || data.discountType === PROMO_ACCESS_DAYS;
}

export interface PromotionFormData {
  // Step 1: Basic Info
  name: string;
  type: string;
  description: string;
  startDate: string;
  endDate: string;
  category: string;
  code: string;

  // Step 2: Discount
  discountType: string;
  discountValue: string;
  minimumPurchase: string;
  maximumDiscount: string;
  usageLimit: string;
  usageLimitPerMember: string;

  // Step 3: Targeting
  targetAudience: string;
  channels: string[];
  applicablePlans: string[];

  // Step 4: Settings
  priority: string;
  autoApply: boolean;
  stackable: boolean;
  isPublic: boolean;
  termsAndConditions: string;
  /** Comma-separated, split on submit so typing a comma doesn't get eaten. */
  tags: string;

  // Not edited on mobile — carried through so an edit doesn't wipe them.
  status: string;
  image: string;
  applicableServices: string[];
  specificMembers: string[];
  policyRulesJson: string;
  policyConfigJson: string;
}

export const DEFAULT_PROMOTION_FORM_DATA: PromotionFormData = {
  name: '',
  type: '',
  description: '',
  startDate: '',
  endDate: '',
  category: '',
  code: '',

  discountType: '',
  discountValue: '',
  minimumPurchase: '',
  maximumDiscount: '',
  usageLimit: '',
  usageLimitPerMember: '',

  targetAudience: 'all',
  channels: [],
  applicablePlans: [],

  priority: '2',
  autoApply: false,
  stackable: false,
  isPublic: false,
  termsAndConditions: '',
  tags: '',

  status: '',
  image: '',
  applicableServices: [],
  specificMembers: [],
  policyRulesJson: '',
  policyConfigJson: '',
};

const numberToString = (value?: number | null) =>
  value !== null && value !== undefined ? String(value) : '';

export function mapPromotionToFormData(
  promotion?: PromotionCampaignResponse,
): PromotionFormData {
  if (!promotion) return DEFAULT_PROMOTION_FORM_DATA;

  return {
    name: promotion.name,
    type: promotion.type ?? '',
    description: promotion.description ?? '',
    startDate: promotion.startDate ?? '',
    endDate: promotion.endDate ?? '',
    category: promotion.category ?? '',
    code: promotion.code ?? '',

    discountType: promotion.discountType ?? '',
    discountValue: numberToString(promotion.discountValue),
    minimumPurchase: numberToString(promotion.minimumPurchase),
    maximumDiscount: numberToString(promotion.maximumDiscount),
    usageLimit: numberToString(promotion.usageLimit),
    usageLimitPerMember: numberToString(promotion.usageLimitPerMember),

    targetAudience: promotion.targetAudience || 'all',
    channels: promotion.channels ?? [],
    applicablePlans: promotion.applicablePlans ?? [],

    priority: promotion.priority !== null && promotion.priority !== undefined ? String(promotion.priority) : '2',
    autoApply: Boolean(promotion.autoApply),
    stackable: Boolean(promotion.stackable),
    isPublic: Boolean(promotion.isPublic),
    termsAndConditions: promotion.termsAndConditions ?? '',
    tags: (promotion.tags ?? []).join(', '),

    status: promotion.status ?? '',
    image: promotion.image ?? '',
    applicableServices: promotion.applicableServices ?? [],
    specificMembers: promotion.specificMembers ?? [],
    policyRulesJson: promotion.policyRulesJson ?? '',
    policyConfigJson: promotion.policyConfigJson ?? '',
  };
}

const toNumber = (value: string) => {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

// active/scheduled/expired are date-derived, not manual choices — recompute them
// from the (possibly just-edited) date range, same as the web form. "draft" and
// "paused" are genuine manual states and are left as-is.
const DATE_DRIVEN_STATUSES = ['active', 'scheduled', 'expired'];

function deriveStatusFromDates(data: PromotionFormData): string {
  const today = format(new Date(), 'yyyy-MM-dd');
  if (data.endDate && data.endDate < today) return 'expired';
  if (data.startDate && data.startDate > today) return 'scheduled';
  return 'active';
}

export function buildPromotionRequest(
  data: PromotionFormData,
  statusOverride?: string,
): PromotionCampaignRequest {
  const status =
    statusOverride ||
    (DATE_DRIVEN_STATUSES.includes(data.status) ? deriveStatusFromDates(data) : data.status) ||
    deriveStatusFromDates(data);

  const accessDays = isAccessDaysPromotion(data);

  return {
    name: data.name.trim(),
    type: data.type || 'discount',
    status,
    description: data.description.trim(),
    startDate: data.startDate || undefined,
    endDate: data.endDate || undefined,
    category: data.category,
    code: data.code.trim() || undefined,

    discountType: data.discountType || 'percentage',
    discountValue: accessDays ? undefined : toNumber(data.discountValue),
    minimumPurchase: toNumber(data.minimumPurchase),
    maximumDiscount: toNumber(data.maximumDiscount),
    usageLimit: toNumber(data.usageLimit),
    usageLimitPerMember: toNumber(data.usageLimitPerMember),

    targetAudience: data.targetAudience,
    channels: data.channels,
    applicablePlans: data.applicablePlans,
    applicableServices: data.applicableServices,
    specificMembers: data.specificMembers,

    priority: toNumber(data.priority),
    autoApply: data.autoApply,
    stackable: data.stackable,
    isPublic: data.isPublic,
    termsAndConditions: data.termsAndConditions.trim() || undefined,
    tags: data.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),

    image: data.image || undefined,
    policyRulesJson: accessDays ? data.policyRulesJson || undefined : undefined,
    policyConfigJson: accessDays ? data.policyConfigJson || undefined : undefined,
  };
}

export interface PromotionWizardStep {
  id: 'basic' | 'discount' | 'targeting' | 'settings';
  title: string;
  validate: (data: PromotionFormData) => boolean;
}

const hasValidDateRange = (d: PromotionFormData) =>
  !d.startDate || !d.endDate || d.endDate >= d.startDate;

export const PROMOTION_WIZARD_STEPS: PromotionWizardStep[] = [
  {
    id: 'basic',
    title: 'Basic Info',
    validate: (d) => d.name.trim().length > 0 && d.type.length > 0 && hasValidDateRange(d),
  },
  {
    id: 'discount',
    title: 'Discount',
    validate: () => true,
  },
  {
    id: 'targeting',
    title: 'Targeting',
    validate: () => true,
  },
  {
    id: 'settings',
    title: 'Settings',
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

  const save = useCallback(async (statusOverride?: string) => {
    try {
      const request = buildPromotionRequest(data, statusOverride);
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

  const submit = useCallback(() => save(), [save]);
  const saveDraft = useCallback(() => save('draft'), [save]);

  // Mirrors the web's submit guard: a draft only needs a name, type and sane dates.
  const canSaveDraft = PROMOTION_WIZARD_STEPS[0].validate(data);

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
    saveDraft,
    canSaveDraft,
  };
}
