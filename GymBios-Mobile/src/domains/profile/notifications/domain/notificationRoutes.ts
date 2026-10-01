import type { NotificationItem } from './notification.types';

/**
 * The backend's `actionUrl` is a web-app path ("/members", "/leads", ...).
 * Mobile screens live under role groups and only cover part of the web app,
 * so each web path is mapped explicitly to the mobile route that exists for
 * the current role. Returns null when there is no mobile equivalent.
 */
type RouteResolver = (roleGroup: string, item: NotificationItem) => string | null;

const hasId = (id: unknown): id is number => typeof id === 'number' && Number.isInteger(id) && id > 0;

const ROUTES: Record<string, RouteResolver> = {
  members: (role, item) => {
    if (role !== '(admin)') return null;
    return hasId(item.referenceId) ? `/(admin)/members/${item.referenceId}` : '/(admin)/members';
  },
  leads: (role) => (role === '(admin)' ? '/(admin)/leads' : null),
  'follow-ups': (role) => (role === '(admin)' ? '/(admin)/follow-ups' : null),
  'reward-queue': (role) => (role === '(admin)' ? '/(admin)/referrals/reward-queue' : null),
  billing: (role) => (role === '(admin)' ? '/(admin)/billing' : null),
  'staffs-trainers': (role) => (role === '(admin)' ? '/(admin)/staff' : null),
  community: (role) =>
    ['(admin)', '(member)', '(staff)', '(trainer)'].includes(role) ? `/${role}/community` : null,
  bookings: (role) => (role === '(member)' ? '/(member)/bookings' : null),
  'membership-renewal': (role) => (role === '(member)' ? '/(member)/membership' : null),
  'membership-payment': (role, item) => {
    if (role !== '(member)') return null;
    const id = Number(item.actionUrl?.split('/').filter(Boolean)[1]);
    return hasId(id) ? `/(member)/membership-payment/${id}` : null;
  },
};

export function resolveNotificationRoute(item: NotificationItem, roleGroup: string): string | null {
  if (!item.actionUrl) return null;
  const [firstSegment] = item.actionUrl.split(/[?#]/)[0].split('/').filter(Boolean);
  const resolver = firstSegment ? ROUTES[firstSegment] : undefined;
  return resolver ? resolver(roleGroup, item) : null;
}
