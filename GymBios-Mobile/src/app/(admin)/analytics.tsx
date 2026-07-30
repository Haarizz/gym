import { createAdminAnalyticsScreen } from '@/domains/reports/presentation/screens/AdminAnalyticsScreen';
import { useRestoreSession } from '@/domains/auth';

const AdminAnalyticsScreen = createAdminAnalyticsScreen(useRestoreSession);
export default AdminAnalyticsScreen;
