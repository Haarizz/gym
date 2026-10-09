import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { FeatherIcon } from '@/shared/components/CurrencyIcon';
import { CurrencyValue } from '@/core/providers';
import { BrandColors, Glass, Radius, Spacing } from '@/core/theme';
import { GlassSurface } from '@/shared/components';
import type { CenterSummary } from '@/domains/discovery';
import { resolveImageUrl } from '@/shared/utils/resolveImageUrl';

const PAYMENT_ICON: Record<string, keyof typeof Feather.glyphMap> = {
  Cash: 'dollar-sign',
  Card: 'credit-card',
  BNPL: 'zap',
};

const CATEGORY_STYLE: Record<string, { bg: string; text: string }> = {
  Gym: { bg: '#E6F2F0', text: BrandColors.tealDark },
  'Fitness Center': { bg: '#FFEDD5', text: '#C2410C' },
  'Wellness Center': { bg: '#F3E8FF', text: '#7E22CE' },
  Studio: { bg: '#FCE7F3', text: '#BE185D' },
};
const DEFAULT_CATEGORY_STYLE = { bg: '#F1F5F9', text: BrandColors.textPrimary };

const GENDER_STYLE: Record<string, { bg: string; text: string }> = {
  'Ladies Only': { bg: '#FCE7F3', text: '#BE185D' },
  'Men Only': { bg: '#E0E7FF', text: '#3730A3' },
};

interface CenterCardProps {
  center: CenterSummary;
  onViewDetails: (center: CenterSummary) => void;
  onBuyMembership: (center: CenterSummary) => void;
  distanceKm?: number;
}

export function CenterCard({ center, onViewDetails, onBuyMembership, distanceKm }: CenterCardProps) {
  const coverUrl = resolveImageUrl(center.coverImageUrl);
  const showGenderBadge = !!center.accessType && center.accessType !== 'Mixed';
  const showRating = center.reviewCount > 0 && center.avgRating != null;

  const categoryStyle = center.centerType ? (CATEGORY_STYLE[center.centerType] || DEFAULT_CATEGORY_STYLE) : null;
  const genderStyle = center.accessType ? GENDER_STYLE[center.accessType] : undefined;
  const paymentMethods = center.acceptedPaymentMethods ?? [];

  return (
    <GlassSurface strong radius={20} style={styles.card}>
      <View style={styles.cardTop}>
        {/* Thumbnail */}
        <View style={styles.thumb}>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <Feather name="activity" size={28} color="rgba(255,255,255,0.85)" />
          )}
          {distanceKm != null && (
            <View style={styles.distanceBadge}>
              <Feather name="navigation" size={9} color="#FFFFFF" />
              <Text style={styles.distanceText}>{distanceKm.toFixed(1)} km</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.info}>
          {(categoryStyle || showGenderBadge) && (
            <View style={styles.tagsRow}>
              {categoryStyle && (
                <View style={[styles.tag, { backgroundColor: categoryStyle.bg }]}>
                  <Text style={[styles.tagText, { color: categoryStyle.text }]} numberOfLines={1}>
                    {center.centerType}
                  </Text>
                </View>
              )}
              {showGenderBadge && (
                <View style={[styles.tag, { backgroundColor: genderStyle?.bg ?? '#F1F5F9' }]}>
                  <Text style={[styles.tagText, { color: genderStyle?.text ?? BrandColors.tealDark }]} numberOfLines={1}>
                    {center.accessType}
                  </Text>
                </View>
              )}
            </View>
          )}

          <Text style={styles.centerName} numberOfLines={2}>
            {center.centerName}
          </Text>

          {!!center.address && (
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={12} color={BrandColors.tealDark} />
              <Text style={styles.addressText} numberOfLines={1}>
                {center.address}
              </Text>
            </View>
          )}

          {showRating && (
            <View style={styles.ratingRow}>
              <Feather name="star" size={12} color={BrandColors.memberGold} />
              <Text style={styles.ratingText}>{center.avgRating!.toFixed(1)}</Text>
              <Text style={styles.reviewsText}>({center.reviewCount})</Text>
            </View>
          )}
        </View>
      </View>

      {/* Price + payment methods */}
      <View style={styles.footer}>
        <View style={styles.priceBlock}>
          <Text style={styles.startingFromLabel}>Starting from</Text>
          {center.startingPrice != null ? (
            <View style={styles.priceRow}>
              <Text style={styles.startingPrice}><CurrencyValue amount={center.startingPrice} /></Text>
              <Text style={styles.perMonthText}> /month</Text>
            </View>
          ) : (
            <Text style={styles.startingPrice}>View Subscriptions</Text>
          )}
        </View>

        {paymentMethods.length > 0 && (
          <View style={styles.paymentIconsRow}>
            {/* BNPL gets its own chip below — keep it out of the icon chips so it can't
                take a slot from Cash/Card or render twice. */}
            {paymentMethods.filter((m) => m !== 'BNPL' && PAYMENT_ICON[m]).slice(0, 2).map((method) => (
              <View key={method} style={styles.paymentIconChip}>
                <FeatherIcon name={PAYMENT_ICON[method]} size={11} color={BrandColors.textSecondary} />
                <Text style={styles.paymentIconText}>{method}</Text>
              </View>
            ))}
            {paymentMethods.includes('BNPL') && (
              <View style={styles.bnplChip}>
                <Text style={styles.bnplText}>BNPL</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* CTAs */}
      <View style={styles.ctaRow}>
        <Pressable
          style={({ pressed }) => [styles.viewDetailsButton, pressed && styles.pressed]}
          onPress={() => onViewDetails(center)}
          accessibilityRole="button"
          accessibilityLabel={`View details for ${center.centerName}`}
        >
          <Text style={styles.viewDetailsText}>View Details</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.buyButtonWrapper, pressed && styles.pressed]}
          onPress={() => onBuyMembership(center)}
          accessibilityRole="button"
          accessibilityLabel={`Subscribe at ${center.centerName}`}
        >
          <LinearGradient
            colors={[BrandColors.memberGold, BrandColors.trainerAmber]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buyButton}
          >
            <Text style={styles.buyButtonText}>Subscribe</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 10,
    gap: 10,
    marginBottom: Spacing.md,
  },
  pressed: {
    opacity: 0.85,
  },
  cardTop: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  thumb: {
    width: 96,
    height: 96,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: BrandColors.tealDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  distanceBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  distanceText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    paddingTop: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  centerName: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    color: BrandColors.textSecondary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  reviewsText: {
    fontSize: 11,
    color: BrandColors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingTop: Spacing.two,
    paddingHorizontal: 2,
    borderTopWidth: 1,
    borderColor: 'rgba(30,42,58,0.08)',
  },
  priceBlock: {
    flexShrink: 1,
  },
  startingFromLabel: {
    fontSize: 11,
    color: BrandColors.textSecondary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  startingPrice: {
    fontSize: 17,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  perMonthText: {
    fontSize: 12,
    color: BrandColors.textSecondary,
  },
  paymentIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paymentIconChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Glass.fill,
    borderWidth: 1,
    borderColor: Glass.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  paymentIconText: {
    fontSize: 10,
    color: BrandColors.textSecondary,
    fontWeight: '500',
  },
  bnplChip: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  bnplText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F59E0B',
  },
  ctaRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  viewDetailsButton: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BrandColors.teal,
    backgroundColor: Glass.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.tealDark,
  },
  buyButtonWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buyButton: {
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
