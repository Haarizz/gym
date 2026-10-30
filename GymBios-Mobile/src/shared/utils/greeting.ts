import type { TFunction } from 'i18next';

/**
 * Time-of-day greeting shared by the role header and dashboard welcome cards.
 * Takes the component's `t` so React Compiler re-runs it when the language changes.
 */
export function getGreeting(t: TFunction, date: Date = new Date()): string {
  const hour = date.getHours();

  if (hour < 5) return t('greeting.welcomeBack');
  if (hour < 12) return t('greeting.goodMorning');
  if (hour < 18) return t('greeting.goodAfternoon');
  if (hour < 22) return t('greeting.goodEvening');

  return t('greeting.welcomeBack');
}
