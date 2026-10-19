import { useRouter } from 'expo-router';
import { Trans, useTranslation } from 'react-i18next';
import type { StyleProp, TextStyle } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Text } from '@/shared/components/AppText';
import { CurrencyValue } from '@/core/providers';
import { formatDate } from '@/core/i18n';
import { toast } from '@/shared/components/Toasts/toastStore';
import { offerClaim, type MemberOffer } from '../../domain/MemberDashboardData';

/** Whole days from today to a yyyy-MM-dd end date (0 = ends today), in the device's time zone. */
export function daysUntil(endDate: string): number {
  const [y, m, d] = endDate.split('-').map(Number);
  const end = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - today.getTime()) / 86_400_000);
}

/** "Ends today" / "Ends in 3 days" within a week, else "Until <date>"; null without an end date or once past it. */
export function useOfferEndsLabel(offer: MemberOffer): string | null {
  const { t } = useTranslation();
  if (!offer.endDate) return null;
  const days = daysUntil(offer.endDate);
  if (days < 0) return null;
  if (days === 0) return t('memberHome.offer.endsToday');
  if (days <= 7) return t('memberHome.offer.endsInDays', { count: days });
  return t('memberHome.offer.until', { date: formatDate(offer.endDate, 'PP') });
}

/** The headline discount: "15% off", "<amount> off", "Free". Null when there's no price discount to state. */
export function DiscountLabel({ offer, style, showCap = true }: {
  offer: MemberOffer;
  style?: StyleProp<TextStyle>;
  /** Append "· up to <amount>" for a capped percentage */
  showCap?: boolean;
}) {
  const { t } = useTranslation();
  if (offer.discountType === 'free') return <Text style={style}>{t('memberHome.offer.free')}</Text>;
  if (offer.discountValue <= 0) return null;
  if (offer.discountType === 'fixed') {
    return (
      <Text style={style}>
        <Trans i18nKey="memberHome.offer.amountOff" components={{ amount: <CurrencyValue amount={offer.discountValue} /> }} />
      </Text>
    );
  }
  if (offer.discountType === 'percentage' || !offer.discountType) {
    return (
      <Text style={style}>
        {t('memberHome.offer.percentOff', { value: offer.discountValue })}
        {showCap && offer.maximumDiscount != null && offer.maximumDiscount > 0 && (
          <Trans i18nKey="memberHome.offer.upTo" components={{ amount: <CurrencyValue amount={offer.maximumDiscount} /> }} />
        )}
      </Text>
    );
  }
  return null;
}

/**
 * What an offer's buttons do. Claim renews with it applied (membership — by code, or by id when it
 * has none), books a session with its code (services), or copies the code; see offerClaim.
 */
export function useOfferActions(offer: MemberOffer) {
  const router = useRouter();
  const { t } = useTranslation();
  const claim = offerClaim(offer);

  const copyCode = async () => {
    if (!offer.code) return;
    await Clipboard.setStringAsync(offer.code);
    toast.success(t('memberHome.offer.copied'));
  };

  const onClaim = () => {
    if (claim === 'renew') {
      const params = offer.code
        ? { renew: '1', promoCode: offer.code }
        : { renew: '1', promotionId: String(offer.id), offerName: offer.name };
      router.push({ pathname: '/(member)/membership', params } as any);
    } else if (claim === 'book') {
      router.push({ pathname: '/(member)/bookings', params: { promoCode: offer.code! } } as any);
    } else {
      copyCode();
    }
  };

  const claimLabel = claim === 'copy' ? t('memberHome.offer.copyCode') : t('memberHome.offer.cta');
  const claimA11y = claim === 'copy' ? t('memberHome.offer.copyCodeA11y') : t('memberHome.offer.ctaA11y');

  return { claim, onClaim, copyCode, claimLabel, claimA11y };
}
