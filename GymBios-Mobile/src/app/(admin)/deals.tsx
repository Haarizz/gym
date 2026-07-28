import { createAdminDealsScreen } from '@/domains/crm/presentation/screens/AdminDealsScreen';
import { useRestoreSession } from '@/domains/auth';

const AdminDealsScreen = createAdminDealsScreen(useRestoreSession);
export default AdminDealsScreen;
