import { env } from '@/core/platform/config';

const API_ORIGIN = env.apiBaseUrl.replace(/\/api\/?$/, '');

export function resolveImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}
