import type { LocaleResource } from '../en';
import common from './common';
import settings from './settings';
import onboarding from './onboarding';

const ta: LocaleResource = {
  ...common,
  ...settings,
  ...onboarding,
};

export default ta;
