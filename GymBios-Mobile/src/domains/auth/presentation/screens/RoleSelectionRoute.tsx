import { RoleSelectionScreen } from './RoleSelectionScreen';
import type { createUseSelectAppRole } from '../hooks/useAuthFlow';

export function createRoleSelectionRoute(useSelectAppRole: ReturnType<typeof createUseSelectAppRole>) {
  return function RoleSelectionRoute() {
    const { selectRole } = useSelectAppRole();
    return <RoleSelectionScreen onRoleSelect={selectRole} />;
  };
}
