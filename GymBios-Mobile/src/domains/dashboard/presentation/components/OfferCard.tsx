import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { Text } from '@/shared/components/AppText';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import type { MemberOffer } from '../../domain/MemberDashboardData';
import { DiscountLabel, useOfferActions, useOfferEndsLabel } from './offerParts';

/**
 * The All Offers screen's cards. Consecutive cards rotate through five designs so a long list
 * doesn't read as one repeated block; every design shows the same facts and actions.
 */
const VARIANTS = [AuroraCard, TicketCard, StripeCard, SunsetCard, MidnightCard] as const;

export function OfferCard({ offer, index }: { offer: MemberOffer; index: number }) {
  const Variant = VARIANTS[index % VARIANTS.length];
  return <Variant offer={offer} />;
}

// ── Shared pieces ──────────────────────────────────────────────────────────

function useCard(offer: MemberOffer) {
  const { t } = useTranslation();
  const actions = useOfferActions(offer);
  const endsLabel = useOfferEndsLabel(offer);
  return { t, endsLabel, ...actions };
}

function PersonalRibbon({ style, textStyle }: { style?: StyleProp<ViewStyle>; textStyle?: StyleProp<TextStyle> }) {
  const { t } = useTranslation();
  return (
    <View style={[styles.ribbon, style]}>
      <Text style={[styles.ribbonText, textStyle]}>{t('memberHome.offer.justForYou')}</Text>
    </View>
  );
}

function CodeChip({ code, onPress, color, borderColor }: {
  code: string;
  onPress: () => void;
  color: string;
  borderColor: string;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      style={[styles.codeChip, { borderColor }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('memberHome.offer.copyA11y', { code })}
    >
      <Text style={[styles.codeValue, { color }]}>{code}</Text>
      <Feather name="copy" size={13} color={color} />
    </Pressable>
  );
}

function ClaimButton({ label, a11y, onPress, background, color }: {
  label: string;
  a11y: string;
  onPress: () => void;
  background: string;
  color: string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.claim, { backgroundColor: background }, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
    >
      <Text style={[styles.claimText, { color }]}>{label}</Text>
    </Pressable>
  );
}

// ── 1. Aurora: violet gradient, like the dashboard banner ──────────────────

function AuroraCard({ offer }: { offer: MemberOffer }) {
  const { endsLabel, claim, onClaim, copyCode, claimLabel, claimA11y } = useCard(offer);
  return (
    <View style={[styles.card, styles.aurora]}>
      <LinearGradient
        colors={['rgba(124,58,237,0.9)', 'rgba(109,40,217,0.74)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.auroraBlob} />
      {offer.personal && <PersonalRibbon style={styles.ribbonLight} textStyle={styles.ribbonLightText} />}
      <View style={styles.auroraPill}>
        <DiscountLabel offer={offer} style={styles.auroraPillText} />
      </View>
      <Text style={[styles.name, styles.onDark]}>{offer.name}</Text>
      {!!offer.description && <Text style={[styles.description, styles.onDarkMuted]} numberOfLines={3}>{offer.description}</Text>}
      {endsLabel && <Text style={[styles.meta, styles.onDarkMuted]}>{endsLabel}</Text>}
      <View style={styles.footer}>
        {!!offer.code && <CodeChip code={offer.code} onPress={copyCode} color="#FFFFFF" borderColor="rgba(255,255,255,0.7)" />}
        {claim !== 'none' && <ClaimButton label={claimLabel} a11y={claimA11y} onPress={onClaim} background="#FFFFFF" color="#6D28D9" />}
      </View>
    </View>
  );
}

// ── 2. Ticket: a cream coupon with a gold stub and a perforated edge ───────

function TicketCard({ offer }: { offer: MemberOffer }) {
  const { endsLabel, claim, onClaim, copyCode, claimLabel, claimA11y } = useCard(offer);
  return (
    <View style={[styles.card, styles.ticket]}>
      <View style={styles.ticketStub}>
        <Feather name="tag" size={18} color="#78350F" />
        <DiscountLabel offer={offer} style={styles.ticketStubText} showCap={false} />
      </View>
      {/* Perforation: notches top and bottom joined by a dashed line */}
      <View style={styles.ticketPerforation}>
        <View style={[styles.ticketNotch, styles.ticketNotchTop]} />
        <View style={styles.ticketDash} />
        <View style={[styles.ticketNotch, styles.ticketNotchBottom]} />
      </View>
      <View style={styles.ticketBody}>
        {offer.personal && <PersonalRibbon style={styles.ribbonGold} textStyle={styles.ribbonGoldText} />}
        <Text style={[styles.name, styles.ticketName]}>{offer.name}</Text>
        {!!offer.description && <Text style={[styles.description, styles.ticketMuted]} numberOfLines={2}>{offer.description}</Text>}
        {endsLabel && <Text style={[styles.meta, styles.ticketMuted]}>{endsLabel}</Text>}
        <View style={styles.footer}>
          {!!offer.code && <CodeChip code={offer.code} onPress={copyCode} color="#92400E" borderColor="#D97706" />}
          {claim !== 'none' && <ClaimButton label={claimLabel} a11y={claimA11y} onPress={onClaim} background="#F59E0B" color="#FFFFFF" />}
        </View>
      </View>
    </View>
  );
}

// ── 3. Stripe: white card, teal accent bar, the discount large on the side ─

function StripeCard({ offer }: { offer: MemberOffer }) {
  const { endsLabel, claim, onClaim, copyCode, claimLabel, claimA11y } = useCard(offer);
  return (
    <View style={[styles.card, styles.stripe]}>
      <View style={styles.stripeBar} />
      <View style={styles.stripeContent}>
        <View style={styles.stripeTop}>
          <View style={styles.flex}>
            {offer.personal && <PersonalRibbon style={styles.ribbonTeal} textStyle={styles.ribbonTealText} />}
            <Text style={[styles.name, styles.stripeName]}>{offer.name}</Text>
            {endsLabel && (
              <View style={styles.stripeEnds}>
                <Feather name="clock" size={12} color={BrandColors.textSecondary} />
                <Text style={[styles.meta, styles.stripeMuted, styles.noMargin]}>{endsLabel}</Text>
              </View>
            )}
          </View>
          <DiscountLabel offer={offer} style={styles.stripeDiscount} showCap={false} />
        </View>
        {!!offer.description && <Text style={[styles.description, styles.stripeMuted]} numberOfLines={3}>{offer.description}</Text>}
        <View style={styles.footer}>
          {!!offer.code && <CodeChip code={offer.code} onPress={copyCode} color={BrandColors.teal} borderColor={BrandColors.teal} />}
          {claim !== 'none' && <ClaimButton label={claimLabel} a11y={claimA11y} onPress={onClaim} background={BrandColors.teal} color="#FFFFFF" />}
        </View>
      </View>
    </View>
  );
}

// ── 4. Sunset: coral-to-amber gradient with the discount as the headline ───

function SunsetCard({ offer }: { offer: MemberOffer }) {
  const { endsLabel, claim, onClaim, copyCode, claimLabel, claimA11y } = useCard(offer);
  return (
    <View style={[styles.card, styles.sunset]}>
      <LinearGradient
        colors={['#FB7185', '#F97316', '#F59E0B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={[styles.sunsetRing, styles.sunsetRingLarge]} />
      <View pointerEvents="none" style={[styles.sunsetRing, styles.sunsetRingSmall]} />
      {offer.personal && <PersonalRibbon style={styles.ribbonLight} textStyle={styles.ribbonSunsetText} />}
      <DiscountLabel offer={offer} style={styles.sunsetDiscount} />
      <Text style={[styles.name, styles.onDark]}>{offer.name}</Text>
      {!!offer.description && <Text style={[styles.description, styles.onDarkMuted]} numberOfLines={3}>{offer.description}</Text>}
      {endsLabel && <Text style={[styles.meta, styles.onDarkMuted]}>{endsLabel}</Text>}
      <View style={styles.footer}>
        {!!offer.code && <CodeChip code={offer.code} onPress={copyCode} color="#FFFFFF" borderColor="rgba(255,255,255,0.75)" />}
        {claim !== 'none' && <ClaimButton label={claimLabel} a11y={claimA11y} onPress={onClaim} background="#FFFFFF" color="#C2410C" />}
      </View>
    </View>
  );
}

// ── 5. Midnight: dark slate with gold accents ──────────────────────────────

function MidnightCard({ offer }: { offer: MemberOffer }) {
  const { t, endsLabel, claim, onClaim, copyCode, claimLabel, claimA11y } = useCard(offer);
  return (
    <View style={[styles.card, styles.midnight]}>
      <View style={styles.midnightHeader}>
        <View style={styles.midnightIcon}>
          <Feather name={offer.personal ? 'star' : 'award'} size={16} color={BrandColors.memberGold} />
        </View>
        {offer.personal ? (
          <Text style={styles.midnightEyebrow}>{t('memberHome.offer.justForYou')}</Text>
        ) : (
          <View style={styles.flex} />
        )}
        <DiscountLabel offer={offer} style={styles.midnightDiscount} showCap={false} />
      </View>
      <Text style={[styles.name, styles.onDark]}>{offer.name}</Text>
      {!!offer.description && <Text style={[styles.description, styles.midnightMuted]} numberOfLines={3}>{offer.description}</Text>}
      {endsLabel && <Text style={[styles.meta, styles.midnightMuted]}>{endsLabel}</Text>}
      <View style={styles.midnightDivider} />
      <View style={styles.footer}>
        {!!offer.code && <CodeChip code={offer.code} onPress={copyCode} color={BrandColors.memberGold} borderColor="rgba(245,199,66,0.6)" />}
        {claim !== 'none' && <ClaimButton label={claimLabel} a11y={claimA11y} onPress={onClaim} background={BrandColors.memberGold} color="#1E293B" />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    padding: Spacing.four,
    overflow: 'hidden',
    position: 'relative',
  },
  flex: { flex: 1 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.97 }] },
  noMargin: { marginBottom: 0 },

  name: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginBottom: Spacing.one,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    marginBottom: Spacing.two,
  },
  meta: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: Spacing.three,
  },
  onDark: { color: '#FFFFFF' },
  onDarkMuted: { color: 'rgba(255,255,255,0.88)' },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  codeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  codeValue: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  claim: {
    marginStart: 'auto',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.full,
  },
  claimText: {
    fontSize: 13,
    fontWeight: '800',
  },

  ribbon: {
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 3,
    marginBottom: Spacing.two,
  },
  ribbonText: { fontSize: 11, fontWeight: '800' },
  ribbonLight: { backgroundColor: 'rgba(255,255,255,0.22)' },
  ribbonLightText: { color: '#FFFFFF' },
  ribbonSunsetText: { color: '#FFFFFF' },
  ribbonGold: { backgroundColor: '#FDE68A' },
  ribbonGoldText: { color: '#78350F' },
  ribbonTeal: { backgroundColor: 'rgba(50,127,116,0.12)' },
  ribbonTealText: { color: BrandColors.teal },

  // Aurora
  aurora: {
    shadowColor: 'rgba(109,40,217,0.45)',
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  auroraBlob: {
    position: 'absolute',
    top: -50,
    end: -30,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  auroraPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.three,
    paddingVertical: 4,
    marginBottom: Spacing.two,
  },
  auroraPillText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },

  // Ticket
  ticket: {
    flexDirection: 'row',
    padding: 0,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  ticketStub: {
    width: 96,
    backgroundColor: '#FCD34D',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.four,
  },
  ticketStubText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#78350F',
    textAlign: 'center',
  },
  ticketPerforation: {
    width: 14,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ticketNotch: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: BrandColors.screenBackground,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  ticketNotchTop: { marginTop: -8 },
  ticketNotchBottom: { marginBottom: -8 },
  ticketDash: {
    flex: 1,
    borderStartWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#F59E0B',
  },
  ticketBody: {
    flex: 1,
    padding: Spacing.four,
    paddingStart: Spacing.two,
  },
  ticketName: { color: '#78350F' },
  ticketMuted: { color: '#92400E' },

  // Stripe
  stripe: {
    flexDirection: 'row',
    padding: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: 'rgba(15,23,42,0.08)',
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  stripeBar: {
    width: 6,
    backgroundColor: BrandColors.teal,
  },
  stripeContent: {
    flex: 1,
    padding: Spacing.four,
  },
  stripeTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  stripeName: { color: BrandColors.textPrimary },
  stripeEnds: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stripeMuted: { color: BrandColors.textSecondary },
  stripeDiscount: {
    fontSize: 22,
    fontWeight: '900',
    color: BrandColors.teal,
    maxWidth: '45%',
    textAlign: 'right',
  },

  // Sunset
  sunset: {
    shadowColor: 'rgba(249,115,22,0.4)',
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  sunsetRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  sunsetRingLarge: { width: 180, height: 180, borderRadius: 90, bottom: -90, end: -50 },
  sunsetRingSmall: { width: 90, height: 90, borderRadius: 45, top: -30, end: 40 },
  sunsetDiscount: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: Spacing.one,
  },

  // Midnight
  midnight: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(245,199,66,0.35)',
  },
  midnightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  midnightIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245,199,66,0.14)',
  },
  midnightEyebrow: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: BrandColors.memberGold,
  },
  midnightDiscount: {
    fontSize: 15,
    fontWeight: '900',
    color: BrandColors.memberGold,
  },
  midnightMuted: { color: 'rgba(226,232,240,0.82)' },
  midnightDivider: {
    height: 1,
    backgroundColor: 'rgba(148,163,184,0.25)',
    marginBottom: Spacing.three,
  },
});
