// shared/components/ModuleSheet/types.ts

import type { ComponentProps } from 'react';
import Feather from '@expo/vector-icons/Feather';

export type FeatherIconName = ComponentProps<typeof Feather>['name'];

export interface ModuleChild {
  id: string;
  title: string;
  icon: FeatherIconName;
  route: string;
}

export interface ModuleItem {
  id: string;
  title: string;
  icon: FeatherIconName;
  route?: string;
  children?: ModuleChild[];
}