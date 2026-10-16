import { i18n } from '@/core/i18n';

/** Time-of-day greeting shared by the role header and dashboard welcome cards. */
export function getGreeting(date: Date = new Date()): string {
  const hour = date.getHours();

  if (hour < 5) return i18n.t('greeting.welcomeBack');
  if (hour < 12) return i18n.t('greeting.goodMorning');
  if (hour < 18) return i18n.t('greeting.goodAfternoon');
  if (hour < 22) return i18n.t('greeting.goodEvening');

  return i18n.t('greeting.welcomeBack');
}
