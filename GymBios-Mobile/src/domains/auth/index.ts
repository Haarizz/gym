import { AuthOrchestrator } from './application/orchestrators/AuthOrchestrator';
import { LoginUser } from './application/useCases/LoginUser';
import { LogoutUser } from './application/useCases/LogoutUser';
import { RefreshSession } from './application/useCases/RefreshSession';
import { RestoreSession } from './application/useCases/RestoreSession';
import { SelectAppRole } from './application/useCases/SelectAppRole';
import { AuthApi } from './infrastructure/api/AuthApi';
import { AuthRemoteDataSource } from './infrastructure/datasource/AuthRemoteDataSource';
import { AuthRepositoryImpl } from './infrastructure/repository/AuthRepositoryImpl';
import { createAuthBootstrap } from './presentation/components/AuthBootstrap';
import {
  createUseLogin,
  createUseRestoreSession,
  createUseSelectAppRole,
} from './presentation/hooks/useAuthFlow';
import {
  ADMIN_HEADER,
  ADMIN_TABS,
  MEMBER_HEADER,
  MEMBER_TABS,
  RoleTabsLayout,
  STAFF_HEADER,
  STAFF_TABS,
  TRAINER_HEADER,
  TRAINER_TABS,
} from './presentation/navigation/RoleTabsLayout';
import { createRoleLoginScreen } from './presentation/screens/RoleLoginScreen';
import {
  createAdminDashboardScreen,
  createMemberHomeScreen,
  createRolePlaceholderScreen,
  createStaffHomeScreen,
  createTrainerHomeScreen,
} from './presentation/screens/RoleShellScreens';
import { createSplashRoute } from './presentation/screens/SplashRoute';
import { createRoleSelectionRoute } from './presentation/screens/RoleSelectionRoute';
import { createMemberAuthScreen } from './presentation/screens/MemberAuthScreen';

const authApi = new AuthApi();
const authRemoteDataSource = new AuthRemoteDataSource(authApi);
const authRepository = new AuthRepositoryImpl(authRemoteDataSource);

const selectAppRole = new SelectAppRole(authRepository);
const loginUser = new LoginUser(authRepository);
const logoutUser = new LogoutUser(authRepository);
const restoreSession = new RestoreSession(authRepository);
const refreshSession = new RefreshSession(authRepository);

export const authOrchestrator = new AuthOrchestrator(selectAppRole, loginUser, logoutUser);

export const useSelectAppRole = createUseSelectAppRole(authOrchestrator);
export const useLogin = createUseLogin(authOrchestrator);
export const useRestoreSession = createUseRestoreSession(restoreSession, authOrchestrator);

export const AuthBootstrap = createAuthBootstrap(useRestoreSession);
export const RoleLoginScreen = createRoleLoginScreen(useLogin);

export const SplashRoute = createSplashRoute(useRestoreSession);
export const RoleSelectionRoute = createRoleSelectionRoute(useSelectAppRole);
export const MemberAuthScreen = createMemberAuthScreen(useLogin);

export { SplashScreen } from './presentation/screens/SplashScreen';
export { RoleSelectionScreen } from './presentation/screens/RoleSelectionScreen';
export { RoleTabsLayout, ADMIN_TABS, MEMBER_TABS, TRAINER_TABS, STAFF_TABS };
export { ADMIN_HEADER, MEMBER_HEADER, TRAINER_HEADER, STAFF_HEADER };

export const AdminDashboardScreen = createAdminDashboardScreen(useRestoreSession);
export const MemberHomeScreen = createMemberHomeScreen(useRestoreSession);
export const TrainerHomeScreen = createTrainerHomeScreen(useRestoreSession);
export const StaffHomeScreen = createStaffHomeScreen(useRestoreSession);

export const AdminStaffScreen = createRolePlaceholderScreen('Admin Staff', useRestoreSession);
export const AdminDealsScreen = createRolePlaceholderScreen('Admin Deals', useRestoreSession);
export const AdminAnalyticsScreen = createRolePlaceholderScreen('Admin Analytics', useRestoreSession);

export const MemberBookingsScreen = createRolePlaceholderScreen('Member Bookings', useRestoreSession);
export const MemberCentersScreen = createRolePlaceholderScreen('Member Centers', useRestoreSession);
export const MemberMembershipScreen = createRolePlaceholderScreen('Member Membership', useRestoreSession);
export const MemberProfileScreen = createRolePlaceholderScreen('Member Profile', useRestoreSession);

export const TrainerScheduleScreen = createRolePlaceholderScreen('Trainer Schedule', useRestoreSession);
export const TrainerPerformanceScreen = createRolePlaceholderScreen('Trainer Performance', useRestoreSession);
export const TrainerLedgerScreen = createRolePlaceholderScreen('Trainer Ledger', useRestoreSession);
export const TrainerProfileScreen = createRolePlaceholderScreen('Trainer Profile', useRestoreSession);

export const StaffPerformanceScreen = createRolePlaceholderScreen('Staff Performance', useRestoreSession);
export const StaffScheduleScreen = createRolePlaceholderScreen('Staff Schedule', useRestoreSession);
export const StaffLedgerScreen = createRolePlaceholderScreen('Staff Ledger', useRestoreSession);
export const StaffProfileScreen = createRolePlaceholderScreen('Staff Profile', useRestoreSession);

export {
  useAuthStore,
  selectIsAuthenticated,
  selectAppRole,
  selectPendingRole,
} from './store';
export type { LoginDto, SelectAppRoleDto } from './application/dto/LoginDto';
export type { User } from './domain/entities/User';
export type { Session } from './domain/entities/Session';
export type { AppRole } from './domain/valueObjects/AppRole';
export { ROLE_HOME_ROUTES, APP_ROLES, isAppRole } from './domain/valueObjects/AppRole';
export { refreshSession };
