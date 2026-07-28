import { createAdminStaffScreen } from '@/domains/hr/presentation/screens/AdminStaffScreen';
import { useRestoreSession } from '@/domains/auth';

const AdminStaffScreen = createAdminStaffScreen(useRestoreSession);
export default AdminStaffScreen;
