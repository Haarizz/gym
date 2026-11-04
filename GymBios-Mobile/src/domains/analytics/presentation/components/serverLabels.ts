import { useTranslation } from 'react-i18next';

// Fallback names the analytics API puts on unnamed or folded rows.
const KEYS: Record<string, string> = {
  Other: 'analytics.labels.other',
  Unknown: 'analytics.labels.unknown',
  Uncategorised: 'analytics.labels.uncategorised',
  'Add-on': 'analytics.labels.addon',
  Item: 'analytics.labels.item',
  Class: 'analytics.labels.class',
  CASH: 'analytics.pos.methods.cash',
  CARD: 'analytics.pos.methods.card',
  ONLINE: 'analytics.pos.methods.online',
  WALLET: 'analytics.pos.methods.wallet',
  CREDIT: 'analytics.pos.methods.credit',
  OTHER: 'analytics.pos.methods.other',
};

/** Translates the API's placeholder labels; real names (plans, products) pass through. */
export function useServerLabel() {
  const { t } = useTranslation();
  return (name: string) => (KEYS[name] ? (t as (k: string) => string)(KEYS[name]) : name);
}
