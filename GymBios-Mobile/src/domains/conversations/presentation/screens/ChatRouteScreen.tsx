import { useMemo } from 'react';
import { useLocalSearchParams, useRouter, useSegments, type Href } from 'expo-router';
import type { ChatTarget } from '../../domain/types';
import { ChatScreen } from './ChatScreen';

type Params = {
  conversationId?: string;
  staffId?: string;
  memberId?: string;
  frontDesk?: string;
  name?: string;
  photoUrl?: string;
};

function positiveInt(value: string | undefined): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * The chat route for every role. Members open it with ?staffId= or ?frontDesk=1, staff
 * with ?memberId=, and anyone with ?conversationId= (lists, push notifications).
 */
export function ChatRouteScreen() {
  const router = useRouter();
  const segments = useSegments();
  const roleGroup = (segments[0] as string) || '(member)';
  const side = roleGroup === '(member)' ? 'member' : 'staff';
  const params = useLocalSearchParams<Params>();

  const target = useMemo<ChatTarget>(() => {
    const conversationId = positiveInt(params.conversationId);
    if (conversationId) return { kind: 'conversation', conversationId };
    if (side === 'member') {
      const staffId = positiveInt(params.staffId);
      return staffId ? { kind: 'staff', staffId } : { kind: 'frontDesk' };
    }
    return { kind: 'member', memberId: positiveInt(params.memberId) ?? 0 };
  }, [params.conversationId, params.staffId, params.memberId, side]);

  // Opened from a push on a cold start there is nothing to go back to.
  const onBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace((side === 'member' ? '/(member)/team' : `/${roleGroup}/messaging/chats`) as Href);
  };

  return (
    <ChatScreen
      // A different person on the same route must not reuse the previous chat's state.
      key={JSON.stringify(target)}
      side={side}
      target={target}
      roleGroup={roleGroup}
      fallbackName={params.name || undefined}
      fallbackPhotoUrl={params.photoUrl || undefined}
      onBack={onBack}
    />
  );
}
