import { i18n } from '@/core/i18n';

/**
 * Phones are compared on their last 10 digits so formatting and country-code
 * differences ("+91 98765 43210" vs "9876543210") still count as the same
 * number. Keep in sync with samePhone() in the backend's MobileProfileService.
 */
const phoneKey = (phone: string) => phone.replace(/\D/g, '').slice(-10);

export function isSamePhone(a?: string, b?: string): boolean {
  const keyA = phoneKey(a ?? '');
  return keyA.length > 0 && keyA === phoneKey(b ?? '');
}

/** Returns an error if the emergency phone is the member's own number, else null. */
export function validateEmergencyPhone(emergencyPhone: string, memberPhone: string): string | null {
  return isSamePhone(emergencyPhone, memberPhone)
    ? i18n.t('validation.emergencyPhoneSameAsOwn')
    : null;
}
