// Domain Types
export * from './domain';

// Query keys & domain hooks
export { promotionKeys } from './hooks/promotionKeys';
export {
  usePromotions,
  usePromotion,
  useCreatePromotion,
  useUpdatePromotion,
  useDeletePromotion,
  useDuplicatePromotion,
  useBulkPromotionAction,
  useValidatePromotionCode,
  useRedeemPromotion,
  useEligibilityMembers,
  useApplyAccessDays,
} from './hooks/usePromotions';

// Presentation form wizard foundation
export {
  usePromotionWizard,
  mapPromotionToFormData,
  buildPromotionRequest,
  DEFAULT_PROMOTION_FORM_DATA,
  PROMOTION_WIZARD_STEPS,
} from './presentation/hooks/usePromotionWizard';

export type {
  PromotionFormData,
  PromotionWizardStep,
  UsePromotionWizardOptions,
} from './presentation/hooks/usePromotionWizard';
