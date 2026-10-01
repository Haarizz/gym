import { MemberFormScreen } from './MemberFormScreen';
import type { Member } from '../../domain/Member';
import type { MemberPrefill } from '../../hooks/useMemberWizard';

interface MemberCreateEditScreenProps {
  mode: 'create' | 'edit';
  initialData?: Member;
  prefill?: MemberPrefill;
  onSuccess: () => void;
}

// MemberFormScreen owns its safe-area insets, keyboard avoidance and width cap,
// so it isn't wrapped in ScreenLayout (whose own insets and iOS-only
// KeyboardAvoidingView doubled up with the form's).
export function MemberCreateEditScreen({
  mode,
  initialData,
  prefill,
  onSuccess,
}: MemberCreateEditScreenProps) {
  return (
    <MemberFormScreen
      mode={mode}
      initialData={initialData}
      memberId={initialData?.id}
      prefill={prefill}
      onSuccess={onSuccess}
    />
  );
}
