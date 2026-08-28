export * from './domain/StaffDashboardData';
export * from './domain/TrainerDashboardData';
export * from './domain/AdminDashboardData';
export * from './domain/MemberDashboardData';
export * from './hooks/useStaffDashboard';
export * from './hooks/useTrainerDashboard';
export * from './hooks/useAdminDashboard';
export * from './hooks/useMemberDashboard';
export { StaffDashboardScreen, StaffDashboardScreen as StaffHomeScreen } from './presentation/screens/StaffDashboardScreen';
export { TrainerDashboardScreen, TrainerDashboardScreen as TrainerHomeScreen } from './presentation/screens/TrainerDashboardScreen';
export { AdminDashboardScreen, AdminDashboardScreen as AdminHomeScreen } from './presentation/screens/AdminDashboardScreen';
export { MemberDashboardScreen, MemberDashboardScreen as MemberHomeScreen } from './presentation/screens/MemberDashboardScreen';

// Staff components
export * from './presentation/components/StaffWelcomeCard';
export * from './presentation/components/StaffStatsGrid';
export * from './presentation/components/StaffQuickActions';
export * from './presentation/components/StaffUrgentFollowUpsCard';
export * from './presentation/components/StaffRecentConversionsCard';
export * from './presentation/components/StaffMonthSummaryCard';

// Trainer components
export * from './presentation/components/TrainerWelcomeCard';
export * from './presentation/components/TrainerStatsGrid';
export * from './presentation/components/TrainerPendingTasksCard';
export * from './presentation/components/TrainerTodayScheduleCard';
export * from './presentation/components/TrainerQuickActions';

// Admin components
export * from './presentation/components/AdminTopControls';
export * from './presentation/components/AdminAlertsList';
export * from './presentation/components/AdminKpiGrid';
export * from './presentation/components/AdminPaymentMixCard';
export * from './presentation/components/AdminOperationalHighlightsCard';
export * from './presentation/components/AdminQuickActionsCard';
export * from './presentation/components/AdminReportDetailSheet';

// Member components
export * from './presentation/components/MemberWelcomeCard';
export * from './presentation/components/MemberActiveMembershipCard';
export * from './presentation/components/MemberCheckInCard';
export * from './presentation/components/MemberStatsGrid';
export * from './presentation/components/MemberTodayScheduleCard';
export * from './presentation/components/MemberQuickActions';
export * from './presentation/components/MemberOfferBanner';

