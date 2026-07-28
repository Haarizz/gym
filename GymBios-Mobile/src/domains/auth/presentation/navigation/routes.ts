import type { Href } from 'expo-router';

import type { AppRole } from '../../domain/valueObjects/AppRole';
import { ROLE_HOME_ROUTES } from '../../domain/valueObjects/AppRole';

export function getRoleHomeHref(role: AppRole): Href {
  return ROLE_HOME_ROUTES[role] as Href;
}

export const ROLE_SELECTION_HREF = '/role-selection' as Href;
export const ROLE_LOGIN_HREF = '/(auth)/login' as Href;
