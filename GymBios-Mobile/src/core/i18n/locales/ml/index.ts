import type { LocaleResource } from '../en';
import common from './common';
import settings from './settings';
import onboarding from './onboarding';

const ml: LocaleResource = {
  ...common,
  ...settings,
  ...onboarding,
};

export default ml;
