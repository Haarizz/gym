// Domain Models
export type {
  Referral,
  ReferralStatus,
  ReferralPagination,
  ReferralPage,
} from './domain/Referral';
export type { ReferralStats } from './domain/ReferralStats';
export type {
  ReferralRule,
  RewardRuleType,
  RewardRuleEligibility,
  RewardRuleCondition,
} from './domain/ReferralRule';
export type {
  ReferralSettings,
  UpdateReferralSettingsPayload,
} from './domain/ReferralSettings';
export type { ReferralListParams } from './domain/ReferralListParams';
export type {
  CreateReferralPayload,
  UpdateReferralPayload,
  MarkSuccessfulPayload,
  ReferralValidationResponse,
} from './domain/ReferralPayloads';

// Application Layer
export type { ReferralRepository } from './application/ReferralRepository';
export { ReferralService } from './application/ReferralService';

// Infrastructure Layer
export { ApiReferralRepository } from './infrastructure/ApiReferralRepository';

// Hooks & Query Keys
export { referralKeys } from './hooks/referralKeys';
export {
  useReferralStats,
  useReferrals,
  useReferral,
  useReferralRules,
  useReferralSettings,
  useUnredeemedReward,
} from './hooks/useReferrals';
export {
  useCreateReferral,
  useUpdateReferral,
  useDeleteReferral,
  useMarkReferralSuccessful,
  useMarkReferralExpired,
  useUpdateReferralSettings,
  useRedeemReferralReward,
  useValidateReferralCode,
  useFixReferralRewards,
} from './hooks/useReferralActions';

// Presentation Layer — Screens
export { ReferralsHubScreen } from './presentation/screens/ReferralsHubScreen';
export { ReferralsOverviewScreen } from './presentation/screens/ReferralsOverviewScreen';
export { ReferralMembersScreen } from './presentation/screens/ReferralMembersScreen';
export { ReferralActivityScreen } from './presentation/screens/ReferralActivityScreen';
export { MyRewardsScreen } from './presentation/screens/MyRewardsScreen';
export { RewardQueueScreen } from './presentation/screens/RewardQueueScreen';
export { RewardRulesScreen } from './presentation/screens/RewardRulesScreen';
export { ReferralAnalyticsScreen } from './presentation/screens/ReferralAnalyticsScreen';
export { ReferralSettingsScreen } from './presentation/screens/ReferralSettingsScreen';

// Presentation Layer — Components & Hooks
export { ReferralHeader } from './presentation/components/ReferralHeader';
export { ReferralStatsSummary } from './presentation/components/ReferralStatsSummary';
export { ReferralHubMenu, REFERRAL_MENU_ITEMS } from './presentation/components/ReferralHubMenu';
export { ReferralLeaderboard } from './presentation/components/ReferralLeaderboard';
export { ReferralActivityList } from './presentation/components/ReferralActivityList';
export { ReferralMemberCard } from './presentation/components/ReferralMemberCard';
export { ReferralStatusBadge } from './presentation/components/ReferralStatusBadge';
export { ReferralDetailsSheet } from './presentation/components/ReferralDetailsSheet';
export { ReferralFormModal } from './presentation/components/ReferralFormModal';
export { ReferralQrCodeModal } from './presentation/components/ReferralQrCodeModal';
export { ReferralAnalyticsFunnel } from './presentation/components/ReferralAnalyticsFunnel';
export { ReferralPerformanceCards } from './presentation/components/ReferralPerformanceCards';
export { ReferralInsightCard } from './presentation/components/ReferralInsightCard';
export { useReferralFilters } from './presentation/hooks/useReferralFilters';
export { useReferralForm } from './presentation/hooks/useReferralForm';

