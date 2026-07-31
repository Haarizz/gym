// shared/components/ModuleSheet/types.ts

import type { ComponentProps } from 'react';
import Feather from '@expo/vector-icons/Feather';

export type FeatherIconName = ComponentProps<typeof Feather>['name'];

export interface ModuleItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: FeatherIconName;
  route: string;
}

export interface ModuleSection {
  id: string;
  title: string;
  items: ModuleItem[];
}