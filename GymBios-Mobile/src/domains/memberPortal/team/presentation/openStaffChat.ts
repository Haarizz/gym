import type { Href, useRouter } from 'expo-router';
import type { TeamMember } from '../domain/TeamMember';

type Router = ReturnType<typeof useRouter>;

/** Opens the member's chat with this staff member (the chat finds or starts the thread). */
export function openStaffChat(router: Router, member: Pick<TeamMember, 'id' | 'name' | 'photoUrl'>) {
  router.push({
    pathname: '/(member)/team/chat',
    params: { staffId: String(member.id), name: member.name, photoUrl: member.photoUrl ?? '' },
  } as unknown as Href);
}

export function openFrontDeskChat(router: Router) {
  router.push({ pathname: '/(member)/team/chat', params: { frontDesk: '1' } } as unknown as Href);
}
