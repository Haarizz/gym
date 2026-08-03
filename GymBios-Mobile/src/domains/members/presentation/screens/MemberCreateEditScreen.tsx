import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { MemberFormScreen } from './MemberFormScreen';
import type { Member } from '../../domain/Member';

interface MemberCreateEditScreenProps {
  mode: 'create' | 'edit';
  initialData?: Member;
  onSuccess: () => void;
}

export function MemberCreateEditScreen({
  mode,
  initialData,
  onSuccess,
}: MemberCreateEditScreenProps) {
  return (
    <ScreenLayout>
      <MemberFormScreen
        mode={mode}
        initialData={initialData}
        memberId={initialData?.id}
        onSuccess={onSuccess}
      />
    </ScreenLayout>
  );
}