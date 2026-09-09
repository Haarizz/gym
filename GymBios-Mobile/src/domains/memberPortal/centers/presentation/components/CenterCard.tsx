import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Glass, heroTint, Radius, Spacing, TypographyScale } from '@/core/theme';
import { GlassSurface } from '@/shared/components';
import type { CenterSummary } from '@/domains/discovery';

interface CenterCardProps {
  center: CenterSummary;
  onPress: (center: CenterSummary) => void;
}

export function CenterCard({ center, onPress }: CenterCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
      onPress={() => onPress(center)}
      accessibilityRole="button"
      accessibilityLabel={center.centerName}
    >
      <GlassSurface radius={Radius.lg} style={styles.card}>
        {/* Banner / Header Box */}
        <View style={styles.banner}>
          <View style={styles.bannerHeader}>
            {center.centerType && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{center.centerType}</Text>
              </View>
            )}
            {/* Distance would go here if available */}
          </View>

          <View style={styles.bannerBottom}>
            <Text style={styles.centerName}>{center.centerName}</Text>
          </View>
        </View>

        {/* Body info */}
        <View style={styles.body}>
          {center.address && (
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={13} color={BrandColors.textSecondary} />
              <Text style={styles.addressText} numberOfLines={1}>
                {center.address}
              </Text>
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <View>
              <Text style={styles.startingFromLabel}>Plans starting from</Text>
              {center.startingPrice != null ? (
                <Text style={styles.startingPrice}>₹{center.startingPrice.toLocaleString()} / mo</Text>
              ) : (
                <Text style={styles.startingPrice}>View Plans</Text>
              )}
            </View>

            <View style={styles.exploreButton}>
              <Text style={styles.exploreButtonText}>Explore Center</Text>
              <Feather name="arrow-right" size={14} color="#FFFFFF" />
            </View>
          </View>
        </View>
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    marginBottom: Spacing.four,
  },
  card: {},
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  banner: {
    backgroundColor: heroTint(BrandColors.tealDark),
    padding: Spacing.four,
    height: 120,
    justifyContent: 'space-between',
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryBadge: {
    backgroundColor: Glass.fill,
    borderWidth: 1,
    borderColor: Glass.border,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bannerBottom: {
    gap: 2,
  },
  centerName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  reviewsText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
  body: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    color: BrandColors.textSecondary,
  },
  facilityTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  facilityChip: {
    backgroundColor: BrandColors.screenBackground,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  facilityChipText: {
    fontSize: 11,
    color: BrandColors.textPrimary,
    fontWeight: '500',
  },
  facilityMoreChip: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  facilityMoreText: {
    fontSize: 11,
    color: BrandColors.trainerAmber,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
  },
  startingFromLabel: {
    fontSize: 10,
    color: BrandColors.textSecondary,
    fontWeight: '500',
  },
  startingPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: BrandColors.teal,
    marginTop: 1,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BrandColors.teal,
    paddingHorizontal: Spacing.three + 2,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.md,
  },
  exploreButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
