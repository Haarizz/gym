import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { toast } from '@/shared/components/Toasts/toastStore';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import type { CenterPlan } from '@/domains/discovery';
import { useCenterDetails, useCenterPlans } from '@/domains/discovery';
import { resolveImageUrl } from '@/shared/utils/resolveImageUrl';
import { PlanCard } from '../components/PlanCard';
import { PlanPurchaseModal } from '../components/PlanPurchaseModal';
import { CenterDetailTabs, type CenterDetailTab } from '../components/CenterDetailTabs';

const HERO_IMAGE_HEIGHT = 208;

const PAYMENT_LABEL: Record<string, string> = {
  Cash: 'Cash',
  Card: 'Card',
  BNPL: 'Buy Now, Pay Later',
};

const PAYMENT_ICON: Record<string, keyof typeof Feather.glyphMap> = {
  Cash: 'dollar-sign',
  Card: 'credit-card',
  BNPL: 'zap',
};

const GENDER_BADGE_COLORS: Record<string, { backgroundColor: string }> = {
  Mixed: { backgroundColor: '#E0F2FE' },
  'Ladies Only': { backgroundColor: '#FCE7F3' },
  'Men Only': { backgroundColor: '#E0E7FF' },
};
const GENDER_BADGE_TEXT_COLORS: Record<string, { color: string }> = {
  Mixed: { color: '#0284C7' },
  'Ladies Only': { color: '#BE185D' },
  'Men Only': { color: '#3730A3' },
};

export function CenterDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const tenantSlug = params.tenantSlug as string;
  const branchId = Number(params.branchId);
  const initialTab = (params.tab as CenterDetailTab) || 'overview';

  const [selectedPlan, setSelectedPlan] = useState<CenterPlan | null>(null);
  const [isPurchaseModalVisible, setIsPurchaseModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<CenterDetailTab>(initialTab);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const { width: screenWidth } = useWindowDimensions();
  const heroWidth = screenWidth; // full width

  const { data: details, isLoading: isDetailsLoading } = useCenterDetails(
    tenantSlug || '',
    branchId || 0
  );

  const { data: plans, isLoading: isPlansLoading } = useCenterPlans(
    tenantSlug || '',
    branchId || 0
  );

  const images = useMemo(() => {
    const gallery = details?.galleryImageUrls || [];
    const cover = details?.coverImageUrl || null;
    const ordered = cover ? [cover, ...gallery.filter((u) => u !== cover)] : gallery;
    return ordered.map(resolveImageUrl).filter((u): u is string => !!u);
  }, [details]);

  const handleImageScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / heroWidth);
    setActiveImageIndex(index);
  };

  const handleCall = () => {
    if (details?.phone) {
      Linking.openURL(`tel:${details.phone}`).catch(() => {
        toast.info(`Call center at ${details.phone}`, { title: 'Phone Call' });
      });
    }
  };

  const handleNavigate = () => {
    if (details) {
      toast.info(`Navigating to ${details.centerName}, ${details.address}`, { title: 'Directions' });
    }
  };

  const handleSelectPlan = (plan: CenterPlan) => {
    setSelectedPlan(plan);
    setIsPurchaseModalVisible(true);
  };

  if (isDetailsLoading && !details) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={BrandColors.teal} />
      </View>
    );
  }

  if (!details) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.emptyStateText}>Center not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} bounces={false}>
        {/* Hero Card - Edge to edge */}
        <View style={[styles.heroCard, images.length > 0 && { height: HERO_IMAGE_HEIGHT }]}>
          {images.length > 0 && (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleImageScrollEnd}
                style={StyleSheet.absoluteFill}
              >
                {images.map((uri, i) => (
                  <Image
                    key={`${uri}-${i}`}
                    source={{ uri }}
                    style={{ width: heroWidth, height: HERO_IMAGE_HEIGHT }}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
              <LinearGradient
                colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.75)']}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
              {images.length > 1 && (
                <View style={styles.dotsRow} pointerEvents="none">
                  {images.map((_, i) => (
                    <View key={i} style={[styles.dot, i === activeImageIndex && styles.dotActive]} />
                  ))}
                </View>
              )}
            </>
          )}

          <Pressable hitSlop={12} onPress={() => router.back()} style={styles.floatingBackButton}>
            <Feather name="chevron-left" size={22} color="#FFFFFF" />
          </Pressable>

          <View style={styles.heroContentWrapper}>
            {!!details.centerType && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{details.centerType}</Text>
              </View>
            )}

            <Text style={styles.heroName}>{details.centerName}</Text>
            <View style={styles.heroMetaRow}>
              {details.reviewCount > 0 && details.avgRating != null && (
                <View style={styles.heroRatingBadge}>
                  <Feather name="star" size={12} color={BrandColors.memberGold} />
                  <Text style={styles.heroRatingText}>{details.avgRating.toFixed(1)}</Text>
                  <Text style={styles.heroReviewsText}>({details.reviewCount} reviews)</Text>
                </View>
              )}
              {!!details.accessType && (
                <View style={[styles.genderBadgeLight, GENDER_BADGE_COLORS[details.accessType]]}>
                  <Text style={[styles.genderTextLight, GENDER_BADGE_TEXT_COLORS[details.accessType]]}>
                    {details.accessType}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Action Row below Hero Image */}
        <View style={styles.actionBar}>
          <View style={styles.actionItem}>
             <Feather name="map-pin" size={12} color={BrandColors.teal} />
             <Text style={styles.actionText} numberOfLines={1}>{details.address?.split(',')[0] || 'Location'}</Text>
          </View>
          <View style={styles.actionItem}>
             <Feather name="clock" size={12} color={BrandColors.textSecondary} />
             <Text style={styles.actionText}>Est. {details.establishedYear || 'N/A'}</Text>
          </View>
          <Pressable style={styles.callActionButton} onPress={handleCall}>
            <Feather name="phone-call" size={12} color={BrandColors.teal} />
            <Text style={styles.callActionText}>Call</Text>
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: Spacing.four, flex: 1, paddingBottom: Spacing.six + 40 }}>
          <CenterDetailTabs activeTab={activeTab} onSelect={setActiveTab} />

          {activeTab === 'overview' && (
            <>
              {/* About Section */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionHeading}>About</Text>
                {!!details?.about && <Text style={styles.aboutText}>{details.about}</Text>}
              </View>

              {/* Timings */}
              {!!details?.operatingHours && (
                <View style={styles.sectionCard}>
                  <View style={styles.timingHeadingRow}>
                    <Feather name="clock" size={16} color={BrandColors.teal} />
                    <Text style={styles.sectionHeading}>Timings</Text>
                  </View>
                  <Text style={styles.aboutText}>{details.operatingHours}</Text>
                </View>
              )}

              {/* Facilities / Amenities */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionHeading}>Facilities</Text>
                {details?.amenities && details.amenities.length > 0 ? (
                  <View style={styles.facilityGrid}>
                    {details.amenities.map((fac) => (
                      <View key={fac.id || fac.facility_id} style={styles.facilityCard}>
                        <Feather name="check-circle" size={14} color={BrandColors.teal} />
                        <Text style={styles.facilityName}>{fac.name}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyStateText}>No facilities listed for this center yet.</Text>
                )}
              </View>
            </>
          )}

          {activeTab === 'plans' && (
            <View style={styles.sectionCard}>
              {isPlansLoading ? (
                <ActivityIndicator size="small" color={BrandColors.teal} />
              ) : plans && plans.length > 0 ? (
                <View style={styles.plansList}>
                  {plans.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      onSelect={handleSelectPlan}
                      taxPercentage={details?.taxPercentage ?? null}
                      taxInclusive={details?.taxInclusive ?? false}
                    />
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyStateText}>No plans available at the moment.</Text>
              )}
            </View>
          )}

          {activeTab === 'trainers' && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>Trainers</Text>
              {details?.trainers && details.trainers.length > 0 ? (
                <View style={styles.trainerList}>
                  {details.trainers.map((trainer) => (
                    <View key={trainer.staffId || trainer.id} style={styles.trainerItem}>
                      <View style={styles.trainerAvatar}>
                        <Text style={styles.trainerAvatarText}>
                          {trainer.name.substring(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.trainerInfo}>
                        <Text style={styles.trainerName}>{trainer.name}</Text>
                        <Text style={styles.trainerSpecialty}>{trainer.role || 'Staff'}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyStateText}>No trainers listed for this center yet.</Text>
              )}
            </View>
          )}

          {activeTab === 'info' && (
            <>
              {/* Payment Options */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionHeading}>Payment Options</Text>
                {details?.acceptedPaymentMethods && details.acceptedPaymentMethods.length > 0 ? (
                  <View style={styles.paymentList}>
                    {details.acceptedPaymentMethods.map((method) => (
                      <View key={method} style={styles.paymentRow}>
                        <View style={styles.paymentIconBox}>
                          <Feather
                            name={PAYMENT_ICON[method] || 'credit-card'}
                            size={16}
                            color={BrandColors.teal}
                          />
                        </View>
                        <Text style={styles.paymentLabel}>
                          {PAYMENT_LABEL[method] || method}
                          {method === 'BNPL' && details.bnplProvider ? ` via ${details.bnplProvider}` : ''}
                        </Text>
                        <Feather name="check-circle" size={16} color={BrandColors.teal} />
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyStateText}>No payment methods listed for this center yet.</Text>
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Plan Purchase Modal */}
      {selectedPlan && (
        <PlanPurchaseModal
          visible={isPurchaseModalVisible}
          plan={selectedPlan as any}
          center={details as any}
          onClose={() => setIsPurchaseModalVisible(false)}
          onSuccess={() => {
            setIsPurchaseModalVisible(false);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  scrollContent: {
    paddingBottom: 0,
  },
  heroCard: {
    backgroundColor: BrandColors.tealDark,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  floatingBackButton: {
    position: 'absolute',
    top: Spacing.four,
    left: Spacing.three,
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  heroContentWrapper: {
    padding: Spacing.four,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 3,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: Spacing.two,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroRatingText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroReviewsText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  genderBadgeLight: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  genderTextLight: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  heroName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dotsRow: {
    position: 'absolute',
    top: Spacing.two,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: {
    width: 14,
    backgroundColor: '#FFFFFF',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: Spacing.three,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  actionText: {
    fontSize: 12,
    color: BrandColors.textSecondary,
    fontWeight: '500',
  },
  callActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F0FDFA',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
  },
  callActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.teal,
  },
  sectionCard: {
    backgroundColor: BrandColors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: Spacing.three,
  },
  sectionHeading: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '800',
    color: BrandColors.textPrimary,
    marginBottom: Spacing.three,
  },
  timingHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  paymentList: {
    gap: Spacing.two,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
    padding: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: BrandColors.screenBackground,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  paymentIconBox: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  aboutText: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    lineHeight: 20,
    marginTop: -8,
  },
  facilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  facilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '48%',
  },
  facilityName: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    flex: 1,
  },
  trainerList: {
    gap: Spacing.three,
  },
  trainerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two + 2,
    backgroundColor: BrandColors.screenBackground,
    borderRadius: Radius.md,
  },
  trainerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BrandColors.trainerAmber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainerAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  trainerInfo: {
    flex: 1,
  },
  trainerName: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  trainerSpecialty: {
    fontSize: TypographyScale.small,
    color: BrandColors.textSecondary,
    marginTop: 1,
  },
  plansList: {
    marginTop: Spacing.two,
  },
  emptyStateText: {
    fontSize: 13,
    color: BrandColors.textSecondary,
  },
});
