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

// Presentation screens & components
export { PromotionsScreen } from './presentation/screens/PromotionsScreen';
export { PromotionFormScreen } from './presentation/screens/PromotionFormScreen';
export { PromotionCard } from './presentation/components/PromotionCard';
export { PromotionDetailsSheet } from './presentation/components/PromotionDetailsSheet';
export { PromotionForm } from './presentation/components/PromotionForm';

