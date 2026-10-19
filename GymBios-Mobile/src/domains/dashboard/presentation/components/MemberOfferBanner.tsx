import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/shared/components/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { Radius, Spacing, TypographyScale } from '@/core/theme';
import type { MemberOffer } from '../../domain/MemberDashboardData';
import { DiscountLabel, useOfferActions, useOfferEndsLabel } from './offerParts';

// Purple gradient glass — translucent violet tint over a glass surface
const PURPLE_START = 'rgba(124,58,237,0.82)';
const PURPLE_END   = 'rgba(109,40,217,0.68)';

/** The dashboard's offer: the best promotion the server found for this member; nothing when there's none. */
export function MemberOfferBanner({ offer }: { offer?: MemberOffer }) {
  return offer ? <OfferBanner offer={offer} /> : null;
}

function OfferBanner({ offer }: { offer: MemberOffer }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { claim, onClaim, copyCode, claimLabel, claimA11y } = useOfferActions(offer);
  const endsLabel = useOfferEndsLabel(offer);

  return (
    <View style={styles.banner}>
      <LinearGradient
        colors={[PURPLE_START, PURPLE_END]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Shine streak overlay — matches reference .cta::after */}
      <View pointerEvents="none" style={styles.shineOverlay} />
      {/* Decorative radial blob */}
      <View pointerEvents="none" style={styles.blobDecor} />

      <View style={styles.headerRow}>
        <View style={styles.iconBox}>
          <Feather name={offer.personal ? 'star' : 'gift'} size={16} color="#FFFFFF" />
        </View>
        <Text style={styles.eyebrow}>
          {offer.personal ? t('memberHome.offer.justForYou') : t('memberHome.offer.title')}
        </Text>
      </View>

      <Text style={styles.title}>{offer.name}</Text>

      <View style={styles.metaRow}>
        <View style={styles.badge}><DiscountLabel offer={offer} style={styles.badgeText} /></View>
        {endsLabel && <Text style={styles.metaText}>{endsLabel}</Text>}
      </View>

      {!!offer.description && (
        <Text style={styles.description} numberOfLines={3}>{offer.description}</Text>
      )}

      {!!offer.code && (
        <Pressable
          style={styles.codeChip}
          onPress={copyCode}
          accessibilityRole="button"
          accessibilityLabel={t('memberHome.offer.copyA11y', { code: offer.code })}
        >
          <Text style={styles.codeLabel}>{t('memberHome.offer.code')}</Text>
          <Text style={styles.codeValue}>{offer.code}</Text>
          <Feather name="copy" size={13} color="#FFFFFF" />
        </Pressable>
      )}

      {!!offer.termsAndConditions && (
        <Text style={styles.terms} numberOfLines={2}>{offer.termsAndConditions}</Text>
      )}

      <View style={styles.actionsRow}>
        {claim !== 'none' && (
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={onClaim}
            accessibilityRole="button"
            accessibilityLabel={claimA11y}
          >
            <Text style={styles.buttonText}>{claimLabel}</Text>
          </Pressable>
        )}
        <Pressable
          hitSlop={8}
          onPress={() => router.push('/(member)/offers' as any)}
          accessibilityRole="button"
          accessibilityLabel={t('memberHome.offer.seeAllA11y')}
        >
          <Text style={styles.seeAll}>{t('memberHome.offer.seeAll')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: Radius.xl,
    padding: Spacing.four,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
    shadowColor: 'rgba(109,40,217,0.45)',
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    position: 'relative',
  },
  shineOverlay: {
    position: 'absolute',
    top: '-40%',
    left: '-15%',
    width: '55%',
    height: '180%',
    backgroundColor: 'rgba(255,255,255,0.18)',
    transform: [{ rotate: '22deg' }],
  },
  blobDecor: {
    position: 'absolute',
    top: -50,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: 0.2,
  },
  title: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    marginBottom: Spacing.two,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.88)',
  },
  description: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.92)',
    lineHeight: 19,
    marginBottom: Spacing.three,
    fontWeight: '500',
  },
  codeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.two,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginBottom: Spacing.three,
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
  },
  codeValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  terms: {
    fontSize: 11,
    lineHeight: 15,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: Spacing.three,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    textDecorationLine: 'underline',
  },
  button: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.full,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6D28D9',
  },
});
