import { useMemo, useRef, useState } from 'react';
import {
  Image,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  ActivityIndicator,
  I18nManager,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/components/AppText';
import { tOr } from '@/core/i18n';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from '@/shared/components/Toasts/toastStore';
import Feather from '@expo/vector-icons/Feather';
import { FeatherIcon } from '@/shared/components/CurrencyIcon';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BrandColors, Spacing } from '@/core/theme';
import type { CenterPlan } from '@/domains/discovery';
import { useCenterDetails, useCenterPlans } from '@/domains/discovery';
import { resolveImageUrl } from '@/shared/utils/resolveImageUrl';
import { PlanCard } from '../components/PlanCard';
import { PlanPurchaseModal } from '../components/PlanPurchaseModal';
import { CenterDetailTabs, type CenterDetailTab } from '../components/CenterDetailTabs';

const HERO_IMAGE_HEIGHT = 208;

type BadgeStyle = { bg: string; text: string; border: string };

const CATEGORY_STYLE: Record<string, BadgeStyle & { icon: keyof typeof MaterialCommunityIcons.glyphMap }> = {
  Gym: { bg: 'rgba(50,127,116,0.1)', text: BrandColors.teal, border: 'rgba(50,127,116,0.2)', icon: 'dumbbell' },
  'Fitness Center': { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA', icon: 'heart-outline' },
  'Wellness Center': { bg: '#FAF5FF', text: '#7E22CE', border: '#E9D5FF', icon: 'waves' },
  Studio: { bg: '#FDF2F8', text: '#BE185D', border: '#FBCFE8', icon: 'account-group-outline' },
};
const DEFAULT_CATEGORY_STYLE = CATEGORY_STYLE.Gym;

const GENDER_STYLE: Record<string, BadgeStyle> = {
  Mixed: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  'Ladies Only': { bg: '#FDF2F8', text: '#BE185D', border: '#FBCFE8' },
  'Men Only': { bg: '#EEF2FF', text: '#4338CA', border: '#C7D2FE' },
};

// Every option is always listed; the ones this center doesn't accept are dimmed.
const PAYMENT_OPTIONS: { key: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: 'Cash', icon: 'dollar-sign' },
  { key: 'Card', icon: 'credit-card' },
  { key: 'BNPL', icon: 'zap' },
];

export function CenterDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const tenantSlug = params.tenantSlug as string;
  const branchId = Number(params.branchId);
  const initialTab = (params.tab as CenterDetailTab) || 'overview';
  // Only present when the member turned on location on the centers list.
  const distanceLabel =
    typeof params.distance === 'string' && params.distance ? t('centers.card.km', { value: params.distance }) : null;

  const [selectedPlan, setSelectedPlan] = useState<CenterPlan | null>(null);
  const [isPurchaseModalVisible, setIsPurchaseModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<CenterDetailTab>(initialTab);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const { width: screenWidth } = useWindowDimensions();
  const [carouselWidth, setCarouselWidth] = useState(0);
  const heroWidth = carouselWidth || screenWidth; // measured width, window as first-frame fallback
  const carouselRef = useRef<ScrollView>(null);
  const contentRef = useRef<ScrollView>(null);

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

  // Plans reference facilities by id; map both id forms to the facility's name.
  const facilityNames = useMemo(() => {
    const map: Record<string, string> = {};
    (details?.amenities || []).forEach((f) => {
      if (f.id != null) map[String(f.id)] = f.name;
      if (f.facility_id != null) map[String(f.facility_id)] = f.name;
    });
    return map;
  }, [details]);

  // The discovery API returns all active staff; the tab is about trainers, so keep
  // trainer/coach roles when there are any and fall back to everyone otherwise.
  const trainers = useMemo(() => {
    const staff = details?.trainers || [];
    const isTrainer = (s: (typeof staff)[number]) =>
      /train|coach|instructor/i.test(`${s.role || ''} ${s.department || ''}`);
    const onlyTrainers = staff.filter(isTrainer);
    return onlyTrainers.length > 0 ? onlyTrainers : staff;
  }, [details]);

  // Track the page from onScroll rather than onMomentumScrollEnd — the latter never
  // fires on web and is skipped for some drag gestures, leaving the dots stale. The
  // page width comes from the event's own layout, not the window, so it stays right
  // if the carousel isn't exactly screen-wide.
  const handleImageScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement } = e.nativeEvent;
    const pageWidth = layoutMeasurement.width || heroWidth;
    if (!pageWidth) return;
    const index = Math.min(Math.max(Math.round(contentOffset.x / pageWidth), 0), images.length - 1);
    setActiveImageIndex((prev) => (prev === index ? prev : index));
  };

  // Clamped so a refetch that returns fewer images never leaves no dot active.
  const currentImageIndex = Math.min(activeImageIndex, Math.max(images.length - 1, 0));

  const goToImage = (index: number) => {
    const wrapped = (index + images.length) % images.length;
    carouselRef.current?.scrollTo({ x: wrapped * heroWidth, animated: true });
    setActiveImageIndex(wrapped);
  };

  const selectTab = (tab: CenterDetailTab) => {
    setActiveTab(tab);
    contentRef.current?.scrollTo({ y: 0, animated: false });
  };

  const handleCall = () => {
    if (!details?.phone) {
      toast.info(t('centers.detail.noPhone'), { title: t('centers.detail.noPhoneTitle') });
      return;
    }
    Linking.openURL(`tel:${details.phone}`).catch(() => {
      toast.info(t('centers.detail.callCenterAt', { phone: details.phone }), { title: t('centers.detail.phoneCallTitle') });
    });
  };

  const handleSelectPlan = (plan: CenterPlan) => {
    const type = plan.planType?.trim().toLowerCase();
    if (type === 'couple' || type === 'family') {
      router.push({
        pathname: '/(member)/family/purchase' as any,
        params: {
          tenantSlug,
          branchId,
          planId: plan.id.toString(),
        }
      });
      return;
    }
    setSelectedPlan(plan);
    setIsPurchaseModalVisible(true);
  };

  // With a single plan there's nothing to choose, so go straight to checkout;
  // otherwise show the plans to pick from.
  const handleBuyMembership = () => {
    if (plans && plans.length === 1) {
      handleSelectPlan(plans[0]);
      return;
    }
    selectTab('plans');
  };

  if (isDetailsLoading && !details) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={BrandColors.teal} />
      </View>
    );
  }

  if (!details) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.bodyText}>{t('centers.detail.notFound')}</Text>
      </View>
    );
  }

  const categoryStyle = details.centerType
    ? CATEGORY_STYLE[details.centerType] || DEFAULT_CATEGORY_STYLE
    : null;
  const genderStyle = details.accessType ? GENDER_STYLE[details.accessType] || GENDER_STYLE.Mixed : null;
  const hasRating = details.reviewCount > 0 && details.avgRating != null;
  const area = details.address?.split(',')[0]?.trim() || null;
  const acceptedMethods = details.acceptedPaymentMethods || [];
  const isMethodEnabled = (key: string) =>
    acceptedMethods.includes(key) || (key === 'BNPL' && details.bnplEnabled);
  const heroHeight = HERO_IMAGE_HEIGHT + insets.top;

  return (
    <View style={styles.container}>
      {/* Image gallery */}
      <View style={[styles.hero, { height: heroHeight }]}>
        {images.length > 0 && (
          <ScrollView
            ref={carouselRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleImageScroll}
            scrollEventThrottle={16}
            style={StyleSheet.absoluteFill}
            onLayout={(e) => setCarouselWidth(e.nativeEvent.layout.width)}
          >
            {images.map((uri, i) => (
              <Image
                key={`${uri}-${i}`}
                source={{ uri }}
                style={{ width: heroWidth, height: heroHeight }}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        )}
        <LinearGradient
          colors={['rgba(0,0,0,0.2)', 'transparent', 'rgba(0,0,0,0.6)']}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Back button */}
        <Pressable
          hitSlop={12}
          onPress={() => router.back()}
          style={[styles.backButton, { top: insets.top + Spacing.four }]}
          accessibilityRole="button"
          accessibilityLabel={t('centers.detail.goBack')}
        >
          <Feather name={I18nManager.isRTL ? 'chevron-right' : 'chevron-left'} size={20} color="#FFFFFF" />
        </Pressable>

        {images.length > 1 && (
          <>
            {/* Image dots */}
            <View style={styles.dotsRow}>
              {images.map((_, i) => (
                <Pressable
                  key={i}
                  hitSlop={6}
                  onPress={() => goToImage(i)}
                  style={[styles.dot, i === currentImageIndex && styles.dotActive]}
                  accessibilityRole="button"
                  accessibilityLabel={t('centers.detail.showImage', { index: i + 1 })}
                />
              ))}
            </View>

            {/* Prev/Next */}
            <Pressable
              hitSlop={8}
              onPress={() => goToImage(currentImageIndex - 1)}
              style={[styles.arrowButton, styles.arrowLeft, { top: insets.top + HERO_IMAGE_HEIGHT / 2 - 14 }]}
              accessibilityRole="button"
              accessibilityLabel={t('centers.detail.previousImage')}
            >
              <Feather name={I18nManager.isRTL ? 'chevron-right' : 'chevron-left'} size={16} color="#FFFFFF" />
            </Pressable>
            <Pressable
              hitSlop={8}
              onPress={() => goToImage(currentImageIndex + 1)}
              style={[styles.arrowButton, styles.arrowRight, { top: insets.top + HERO_IMAGE_HEIGHT / 2 - 14 }]}
              accessibilityRole="button"
              accessibilityLabel={t('centers.detail.nextImage')}
            >
              <Feather name={I18nManager.isRTL ? 'chevron-left' : 'chevron-right'} size={16} color="#FFFFFF" />
            </Pressable>
          </>
        )}

        {/* Name overlay */}
        <View style={styles.nameOverlay} pointerEvents="none">
          {categoryStyle && (
            <View
              style={[
                styles.pillBadge,
                styles.categoryBadge,
                { backgroundColor: categoryStyle.bg, borderColor: categoryStyle.border },
              ]}
            >
              <MaterialCommunityIcons name={categoryStyle.icon} size={12} color={categoryStyle.text} />
              <Text style={[styles.pillText, { color: categoryStyle.text }]}>{tOr(`centers.categories.${details.centerType}`, details.centerType ?? '')}</Text>
            </View>
          )}
          <Text style={styles.heroName}>{details.centerName}</Text>
          <View style={styles.heroMetaRow}>
            <View style={styles.ratingRow}>
              <MaterialCommunityIcons name="star" size={12} color={BrandColors.memberGold} />
              {hasRating ? (
                <>
                  <Text style={styles.ratingValue}>{details.avgRating!.toFixed(1)}</Text>
                  <Text style={styles.ratingCount}>{t('centers.detail.reviews', { count: details.reviewCount })}</Text>
                </>
              ) : (
                <Text style={styles.ratingCount}>{t('centers.detail.noReviews')}</Text>
              )}
            </View>
            {genderStyle && (
              <View style={[styles.pillBadge, { backgroundColor: genderStyle.bg, borderColor: genderStyle.border }]}>
                <Text style={[styles.pillText, { color: genderStyle.text }]}>{tOr(`centers.accessTypes.${details.accessType}`, details.accessType ?? '')}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Quick stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Feather name="map-pin" size={14} color={BrandColors.teal} />
          <Text style={styles.statText} numberOfLines={1}>
            {area || t('centers.detail.location')}
          </Text>
          {distanceLabel && <Text style={styles.statDistance}>· {distanceLabel}</Text>}
        </View>
        {details.establishedYear != null && (
          <View style={styles.statItem}>
            <Feather name="clock" size={14} color="#9CA3AF" />
            <Text style={styles.statText}>{t('centers.detail.established', { year: details.establishedYear })}</Text>
          </View>
        )}
        <Pressable
          onPress={handleCall}
          style={({ pressed }) => [styles.callPill, !details.phone && styles.disabled, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={t('centers.detail.callA11y')}
        >
          <Feather name="phone" size={12} color={BrandColors.teal} />
          <Text style={styles.callText}>{t('centers.detail.call')}</Text>
        </Pressable>
      </View>

      {/* Tabs */}
      <CenterDetailTabs activeTab={activeTab} onSelect={selectTab} />

      {/* Tab content */}
      <ScrollView
        ref={contentRef}
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'overview' && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('centers.detail.about')}</Text>
              <Text style={styles.bodyText}>{details.about || t('centers.detail.noAbout')}</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <Feather name="clock" size={16} color={BrandColors.teal} />
                <Text style={[styles.cardTitle, styles.cardTitleInline]}>{t('centers.detail.timings')}</Text>
              </View>
              <Text style={styles.bodyText}>{details.operatingHours || t('centers.detail.noTimings')}</Text>
            </View>

            <View style={styles.card}>
              <Text style={[styles.cardTitle, styles.cardTitleSpaced]}>{t('centers.detail.facilities')}</Text>
              {details.amenities && details.amenities.length > 0 ? (
                <View style={styles.facilityGrid}>
                  {details.amenities.map((fac) => (
                    <View key={fac.id || fac.facility_id} style={styles.facilityItem}>
                      <Feather name="check-circle" size={14} color={BrandColors.teal} />
                      <Text style={styles.facilityName}>{fac.name}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.bodyText}>{t('centers.detail.noFacilities')}</Text>
              )}
            </View>
          </>
        )}

        {activeTab === 'plans' &&
          (isPlansLoading ? (
            <ActivityIndicator size="small" color={BrandColors.teal} style={styles.loader} />
          ) : plans && plans.length > 0 ? (
            plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onSelect={handleSelectPlan}
                facilityNames={facilityNames}
              />
            ))
          ) : (
            <View style={styles.card}>
              <Text style={styles.bodyText}>{t('centers.detail.noPlans')}</Text>
            </View>
          ))}

        {activeTab === 'trainers' &&
          (trainers.length > 0 ? (
            trainers.map((trainer) => (
              <View key={trainer.staffId || trainer.id} style={[styles.card, styles.trainerCard]}>
                <LinearGradient colors={[BrandColors.teal, BrandColors.tealDark]} style={styles.trainerAvatar}>
                  <Text style={styles.trainerInitials}>
                    {trainer.name
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join('')
                      .toUpperCase()}
                  </Text>
                </LinearGradient>
                <View style={styles.trainerInfo}>
                  <Text style={styles.trainerName}>{trainer.name}</Text>
                  <Text style={styles.trainerSpecialty}>{trainer.department || trainer.role || t('centers.detail.trainerFallback')}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.card}>
              <Text style={styles.bodyText}>{t('centers.detail.noTrainers')}</Text>
            </View>
          ))}

        {activeTab === 'info' && (
          <>
            <View style={styles.card}>
              <Text style={[styles.cardTitle, styles.cardTitleSpaced]}>{t('centers.detail.paymentOptions')}</Text>
              <View style={styles.paymentList}>
                {PAYMENT_OPTIONS.map((opt) => {
                  const enabled = isMethodEnabled(opt.key);
                  return (
                    <View key={opt.key} style={[styles.paymentRow, enabled ? styles.paymentRowOn : styles.paymentRowOff]}>
                      <FeatherIcon name={opt.icon} size={16} color={enabled ? BrandColors.teal : '#9CA3AF'} />
                      <Text style={[styles.paymentLabel, !enabled && styles.paymentLabelOff]}>
                        {tOr(`centers.paymentModes.${opt.key}`, opt.key)}
                        {opt.key === 'BNPL' && enabled && details.bnplProvider
                          ? t('centers.detail.viaProvider', { provider: details.bnplProvider })
                          : ''}
                      </Text>
                      {enabled ? (
                        <Feather name="check-circle" size={16} color={BrandColors.teal} />
                      ) : (
                        <Feather name="x" size={16} color="#D1D5DB" />
                      )}
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <Feather name="shield" size={16} color={BrandColors.teal} />
                <Text style={[styles.cardTitle, styles.cardTitleInline]}>{t('centers.detail.terms')}</Text>
              </View>
              <Text style={styles.bodyText}>
                {details.termsAndPolicies || t('centers.detail.noTerms')}
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[styles.ctaBar, { paddingBottom: Spacing.four + insets.bottom }]}>
        <Pressable
          onPress={handleBuyMembership}
          style={({ pressed }) => [styles.ctaWrapper, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={t('centers.detail.subscribeA11y', { name: details.centerName })}
        >
          <LinearGradient
            colors={[BrandColors.memberGold, BrandColors.trainerAmber]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaButton}
          >
            <Text style={styles.ctaText}>{t('centers.detail.subscribe')}</Text>
          </LinearGradient>
        </Pressable>
      </View>

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

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.05,
  shadowRadius: 3,
  shadowOffset: { width: 0, height: 1 },
  elevation: 1,
} as const;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Hero
  hero: {
    backgroundColor: BrandColors.tealDark,
    overflow: 'hidden',
  },
  backButton: {
    position: 'absolute',
    start: Spacing.four,
    padding: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 10,
  },
  arrowButton: {
    position: 'absolute',
    padding: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  arrowLeft: {
    start: Spacing.four,
  },
  arrowRight: {
    end: Spacing.four,
  },
  dotsRow: {
    position: 'absolute',
    bottom: 64,
    start: 0,
    end: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: {
    width: 16,
    backgroundColor: '#FFFFFF',
  },
  nameOverlay: {
    position: 'absolute',
    start: 0,
    end: 0,
    bottom: 0,
    padding: Spacing.four,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  categoryBadge: {
    marginBottom: 4,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  heroName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ratingCount: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },

  // Quick stats bar
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    backgroundColor: BrandColors.surface,
    paddingHorizontal: Spacing.four,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  statText: {
    fontSize: 11,
    color: '#4B5563',
    flexShrink: 1,
  },
  statDistance: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.teal,
  },
  callPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(50,127,116,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  callText: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.teal,
  },

  // Tab content
  content: {
    flex: 1,
  },
  contentInner: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  loader: {
    marginTop: Spacing.four,
  },
  card: {
    backgroundColor: BrandColors.surface,
    borderRadius: 16,
    padding: Spacing.four,
    ...CARD_SHADOW,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: Spacing.two,
  },
  cardTitleSpaced: {
    marginBottom: Spacing.three,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  cardTitleInline: {
    marginBottom: 0,
  },
  bodyText: {
    fontSize: 12,
    lineHeight: 19,
    color: '#4B5563',
  },
  facilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: Spacing.two,
  },
  facilityItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingEnd: Spacing.two,
  },
  facilityName: {
    flex: 1,
    fontSize: 12,
    color: '#374151',
  },

  // Trainers
  trainerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  trainerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainerInitials: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  trainerInfo: {
    flex: 1,
  },
  trainerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  trainerSpecialty: {
    fontSize: 12,
    color: '#6B7280',
  },

  // Payment options
  paymentList: {
    gap: Spacing.two,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  paymentRowOn: {
    borderColor: 'rgba(50,127,116,0.3)',
    backgroundColor: 'rgba(50,127,116,0.05)',
  },
  paymentRowOff: {
    borderColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
    opacity: 0.5,
  },
  paymentLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2937',
  },
  paymentLabelOff: {
    color: '#9CA3AF',
  },

  // Sticky CTA
  ctaBar: {
    backgroundColor: BrandColors.surface,
    borderTopWidth: 1,
    borderColor: '#F3F4F6',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
  },
  ctaWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: BrandColors.trainerAmber,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  ctaButton: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
});
