import { createAdminDashboardScreen } from '@/domains/reports/presentation/screens/AdminDashboardScreen';
import { useRestoreSession } from '@/domains/auth';

const AdminDashboardScreen = createAdminDashboardScreen(useRestoreSession);
export default AdminDashboardScreen;
