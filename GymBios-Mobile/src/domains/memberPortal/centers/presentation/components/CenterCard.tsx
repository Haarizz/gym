import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import type { CenterSummary } from '@/domains/discovery';
import { resolveImageUrl } from '@/shared/utils/resolveImageUrl';

const PAYMENT_ICON: Record<string, keyof typeof Feather.glyphMap> = {
  Cash: 'dollar-sign',
  Card: 'credit-card',
  BNPL: 'zap',
};

const CATEGORY_STYLE: Record<string, { bg: string; text: string }> = {
  Gym: { bg: 'rgba(50, 127, 116, 0.6)', text: '#FFFFFF' },
  'Fitness Center': { bg: 'rgba(234, 88, 12, 0.75)', text: '#FFFFFF' },
  'Wellness Center': { bg: 'rgba(126, 34, 206, 0.75)', text: '#FFFFFF' },
  Studio: { bg: 'rgba(219, 39, 119, 0.75)', text: '#FFFFFF' },
};
const DEFAULT_CATEGORY_STYLE = { bg: 'rgba(0,0,0,0.6)', text: '#FFFFFF' };

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

  const Banner = (coverUrl ? ImageBackground : View) as any;
  const bannerProps = coverUrl ? { source: { uri: coverUrl }, imageStyle: styles.bannerImage } : {};
  const categoryStyle = center.centerType ? (CATEGORY_STYLE[center.centerType] || DEFAULT_CATEGORY_STYLE) : null;
  const genderStyle = center.accessType ? GENDER_STYLE[center.accessType] : undefined;

  return (
    <View style={styles.pressable}>
      <View style={styles.card}>
        {/* Banner / Header Box */}
        <Banner style={[styles.banner, !coverUrl && { backgroundColor: BrandColors.tealDark }]} {...(bannerProps as any)}>
          {!!coverUrl && (
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.55)']} style={StyleSheet.absoluteFill} />
          )}
          <View style={styles.bannerHeader}>
            {categoryStyle ? (
              <View style={[styles.categoryBadge, { backgroundColor: categoryStyle.bg }]}>
                <Feather name="activity" size={11} color={categoryStyle.text} />
                <Text style={[styles.categoryText, { color: categoryStyle.text }]}>{center.centerType}</Text>
              </View>
            ) : <View />}
            {distanceKm != null && (
              <View style={styles.distanceBadge}>
                <Feather name="navigation" size={11} color="#FFFFFF" />
                <Text style={styles.distanceText}>{distanceKm.toFixed(1)} km</Text>
              </View>
            )}
          </View>

          {showGenderBadge && (
            <View style={styles.bannerBottom}>
              <View style={[styles.genderBadge, genderStyle && { backgroundColor: genderStyle.bg }]}>
                <Text style={[styles.genderText, genderStyle && { color: genderStyle.text }]}>
                  {center.accessType}
                </Text>
              </View>
            </View>
          )}
        </Banner>

        {/* Body info */}
        <View style={styles.body}>
          <View style={styles.bodyHeaderRow}>
            <Text style={styles.centerName} numberOfLines={1}>
              {center.centerName}
            </Text>
            {showRating && (
              <View style={styles.ratingRow}>
                <Feather name="star" size={13} color={BrandColors.memberGold} />
                <Text style={styles.ratingText}>{center.avgRating!.toFixed(1)}</Text>
                <Text style={styles.reviewsText}>({center.reviewCount})</Text>
              </View>
            )}
          </View>

          {center.address && (
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={13} color={BrandColors.teal} />
              <Text style={styles.addressText} numberOfLines={1}>
                {center.address}
              </Text>
            </View>
          )}

          {/* Price + payment icons */}
          <View style={styles.footer}>
            <View>
              <Text style={styles.startingFromLabel}>Starting from</Text>
              <View style={styles.priceRow}>
                {center.startingPrice != null ? (
                  <Text style={styles.startingPrice}>₹{center.startingPrice.toLocaleString()}</Text>
                ) : (
                  <Text style={styles.startingPrice}>View Plans</Text>
                )}
                {center.startingPrice != null && <Text style={styles.perMonthText}> /month</Text>}
              </View>
            </View>

            {center.acceptedPaymentMethods?.length > 0 && (
              <View style={styles.paymentIconsRow}>
                {center.acceptedPaymentMethods.slice(0, 2).map((method) => {
                  const iconName = PAYMENT_ICON[method];
                  if (!iconName) return null;
                  return (
                    <View key={method} style={styles.paymentIconChip}>
                      <Feather name={iconName} size={12} color={BrandColors.textSecondary} />
                      <Text style={styles.paymentIconText}>{method}</Text>
                    </View>
                  );
                })}
                {center.acceptedPaymentMethods.includes('BNPL') && (
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
              accessibilityLabel={`Buy membership at ${center.centerName}`}
            >
              <LinearGradient
                colors={[BrandColors.memberGold, BrandColors.trainerAmber]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buyButton}
              >
                <Text style={styles.buyButtonText}>Buy Membership</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pressable: {
    marginBottom: Spacing.four,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.85,
  },
  banner: {
    height: 160,
    justifyContent: 'space-between',
    padding: Spacing.three,
  },
  bannerImage: {
    resizeMode: 'cover',
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  categoryBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 4,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.teal,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  distanceText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bannerBottom: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  genderBadge: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  genderText: {
    fontSize: 10,
    fontWeight: '700',
    color: BrandColors.tealDark,
  },
  body: {
    padding: Spacing.four,
  },
  bodyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  centerName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.textPrimary,
    marginRight: Spacing.two,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  reviewsText: {
    fontSize: 11,
    color: BrandColors.textSecondary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.three,
  },
  addressText: {
    flex: 1,
    fontSize: 12,
    color: BrandColors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: Spacing.three,
  },
  startingFromLabel: {
    fontSize: 10,
    color: BrandColors.textSecondary,
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  startingPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  perMonthText: {
    fontSize: 11,
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
    gap: 2,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 4,
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
    paddingVertical: 4,
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
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BrandColors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.teal,
  },
  buyButtonWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buyButton: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

