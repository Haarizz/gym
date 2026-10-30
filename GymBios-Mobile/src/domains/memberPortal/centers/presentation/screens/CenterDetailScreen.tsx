import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
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
import { useReducedMotion } from 'react-native-reanimated';
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
import { PlanDetailSheet } from '../components/PlanDetailSheet';
import { PlanPurchaseModal } from '../components/PlanPurchaseModal';
import { TermsAcceptSheet } from '../components/TermsAcceptSheet';
import { TermsText } from '../components/TermsText';
import { CENTER_DETAIL_TABS, CenterDetailTabs, type CenterDetailTab } from '../components/CenterDetailTabs';
import {
  SCREEN_DURATION,
  SCREEN_EASING,
  SCREEN_SLIDE,
  markReturningToCenters,
} from '../hooks/useCentersReturnEntrance';

const HERO_IMAGE_HEIGHT = 220;
/** First-frame estimate of the floating Subscribe bar; replaced by its measured height. */
const CTA_BAR_HEIGHT = 84;
/** Gap between the location row and the tabs, and between the status bar and stuck tabs. */
const TAB_TOP_MARGIN = 14;
const TAB_STICKY_GAP = 8;

// Tab panels enter like the bottom-tab screens (see forTabSlide): from the side
// being moved towards, fading in from a slight scale-down. Driven by RN Animated,
// not a Reanimated layout animation: on web those keep a CSS animation applied
// after they finish, which leaves tall panels (long terms text) half-painted.
const PANEL_SLIDE = SCREEN_SLIDE;
const PANEL_DURATION = SCREEN_DURATION;
const PANEL_EASING = SCREEN_EASING;
/** Going back on web: the page slides out before the list slides in. */
const SCREEN_EXIT_DURATION = 200;

const PAGE_BG = '#F6F7FC';
const MUTED = '#5F6B7A';
const TEAL_SOFT = 'rgba(50,127,116,0.12)';
const PAYMENT_OFF_COLOR = '#A5AEBB';

const CATEGORY_ICON: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  Gym: 'dumbbell',
  'Fitness Center': 'heart-outline',
  'Wellness Center': 'waves',
  Studio: 'account-group-outline',
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
  const [previewPlan, setPreviewPlan] = useState<CenterPlan | null>(null);
  const [isPlanDetailVisible, setIsPlanDetailVisible] = useState(false);
  // Plan waiting on the member to accept the branch terms before checkout.
  const [termsPlan, setTermsPlan] = useState<CenterPlan | null>(null);
  const [activeTab, setActiveTab] = useState<CenterDetailTab>(initialTab);
  const reduceMotion = useReducedMotion();
  // -1/1 while a panel enters from the left/right, settling at 0.
  const [panelProgress] = useState(() => new Animated.Value(0));
  // Opening from the centers list: native stacks already slide the screen in, but
  // web stacks don't animate, so there the page enters like a tab screen does.
  const [screenProgress] = useState(
    () => new Animated.Value(Platform.OS === 'web' && !reduceMotion ? 1 : 0)
  );
  useEffect(() => {
    Animated.timing(screenProgress, {
      toValue: 0,
      duration: PANEL_DURATION,
      easing: PANEL_EASING,
      useNativeDriver: true,
    }).start();
  }, [screenProgress]);
  const screenEntranceStyle = {
    opacity: screenProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
    transform: [
      {
        translateX: screenProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, I18nManager.isRTL ? -PANEL_SLIDE : PANEL_SLIDE],
        }),
      },
      { scale: screenProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.98] }) },
    ],
  };
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const { width: screenWidth } = useWindowDimensions();
  const [carouselWidth, setCarouselWidth] = useState(0);
  const heroWidth = carouselWidth || screenWidth; // measured width, window as first-frame fallback
  const carouselRef = useRef<ScrollView>(null);
  const contentRef = useRef<ScrollView>(null);
  const [scrollY] = useState(() => new Animated.Value(0));
  // Scroll offset at which the tabs stick; large until measured so the backdrop stays hidden.
  const [tabsY, setTabsY] = useState(10000);
  // The Subscribe bar floats over the page; its height varies with font scale and
  // language, so it's measured and the scroll content padded to clear it fully.
  const [ctaHeight, setCtaHeight] = useState(0);

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

  // Switching tabs keeps the tabs in view: if they're already stuck, jump back to
  // where they stick so the new panel starts at its top; otherwise stay put.
  const scrollOffsetRef = useRef(0);
  useEffect(() => {
    const id = scrollY.addListener(({ value }) => {
      scrollOffsetRef.current = value;
    });
    return () => scrollY.removeListener(id);
  }, [scrollY]);

  const selectTab = (tab: CenterDetailTab) => {
    if (tab !== activeTab && !reduceMotion) {
      const delta = CENTER_DETAIL_TABS.indexOf(tab) - CENTER_DETAIL_TABS.indexOf(activeTab);
      // Hide the panel now so the new one never paints in its final spot first.
      panelProgress.setValue(Math.sign(delta) * (I18nManager.isRTL ? -1 : 1));
      Animated.timing(panelProgress, {
        toValue: 0,
        duration: PANEL_DURATION,
        easing: PANEL_EASING,
        useNativeDriver: true,
      }).start();
    }
    setActiveTab(tab);
    if (scrollOffsetRef.current > tabsY) {
      contentRef.current?.scrollTo({ y: tabsY, animated: false });
    }
  };

  // Back always means the centers list: pops to it when it's underneath, and
  // replaces this page with it otherwise (so it never falls through to Home).
  // On web the page first slides out, since web stacks don't animate the pop.
  const leavingRef = useRef(false);
  const handleBack = () => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    markReturningToCenters();
    const goToList = () => router.dismissTo('/(member)/centers' as any);
    if (Platform.OS !== 'web' || reduceMotion) {
      goToList();
      return;
    }
    Animated.timing(screenProgress, {
      toValue: 1,
      duration: SCREEN_EXIT_DURATION,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(goToList);
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

  const branchTerms = details?.termsAndPolicies?.trim() || '';

  // Every purchase path goes through here: a branch with terms shows them first.
  const handleSelectPlan = (plan: CenterPlan) => {
    if (branchTerms) {
      setTermsPlan(plan);
      return;
    }
    proceedToPurchase(plan);
  };

  const handleAcceptTerms = () => {
    const plan = termsPlan;
    setTermsPlan(null);
    if (!plan) return;
    // Brief delay so the sheet animates out before the modal opens.
    setTimeout(() => proceedToPurchase(plan), 280);
  };

  const proceedToPurchase = (plan: CenterPlan) => {
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

  const handlePreviewPlan = (plan: CenterPlan) => {
    setPreviewPlan(plan);
    setIsPlanDetailVisible(true);
  };

  const handleSubscribeFromSheet = (plan: CenterPlan) => {
    setIsPlanDetailVisible(false);
    // Brief delay so the sheet animates out before the modal opens.
    setTimeout(() => handleSelectPlan(plan), 280);
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
      <Animated.View style={[styles.container, styles.centered, screenEntranceStyle]}>
        <ActivityIndicator size="large" color={BrandColors.teal} />
      </Animated.View>
    );
  }

  if (!details) {
    return (
      <Animated.View style={[styles.container, styles.centered, screenEntranceStyle]}>
        <Text style={styles.bodyText}>{t('centers.detail.notFound')}</Text>
      </Animated.View>
    );
  }

  const categoryLabel = details.centerType ? tOr(`centers.categories.${details.centerType}`, details.centerType) : null;
  const categoryIcon = (details.centerType && CATEGORY_ICON[details.centerType]) || CATEGORY_ICON.Gym;
  const accessLabel = details.accessType ? tOr(`centers.accessTypes.${details.accessType}`, details.accessType) : null;
  const hasRating = details.reviewCount > 0 && details.avgRating != null;
  const area = details.address?.split(',')[0]?.trim() || null;
  const acceptedMethods = details.acceptedPaymentMethods || [];
  const isMethodEnabled = (key: string) =>
    acceptedMethods.includes(key) || (key === 'BNPL' && details.bnplEnabled);
  const heroHeight = HERO_IMAGE_HEIGHT + insets.top;

  // Plans with a running offer get the gold "featured" card; otherwise the first plan does.
  const featuredPlanId =
    plans?.find((p) => p.offerActive && p.offerDiscountAmount > 0)?.id ?? plans?.[0]?.id;

  return (
    <Animated.View style={[styles.container, screenEntranceStyle]}>
      <Animated.ScrollView
        ref={contentRef}
        style={styles.content}
        contentContainerStyle={{ paddingBottom: (ctaHeight || CTA_BAR_HEIGHT + insets.bottom) + Spacing.four }}
        scrollIndicatorInsets={{ bottom: ctaHeight || CTA_BAR_HEIGHT + insets.bottom }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[2]}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
      >
        {/* Image gallery */}
        <View style={[styles.hero, { height: heroHeight }]}>
          {images.length > 0 ? (
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
          ) : (
            <>
              <LinearGradient
                colors={['#2C3A35', BrandColors.tealDark, BrandColors.trainerAmber]}
                locations={[0, 0.55, 1.3]}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.heroBlob} pointerEvents="none" />
            </>
          )}
          <LinearGradient
            colors={['rgba(20,26,24,0.05)', 'rgba(20,26,24,0.78)']}
            locations={[0.35, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          {images.length > 1 && (
            <>
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
          <View style={styles.heroInfo} pointerEvents="box-none">
            <View style={styles.heroInfoText} pointerEvents="none">
              {(categoryLabel || accessLabel) && (
                <View style={styles.heroPills}>
                  {categoryLabel && (
                    <View style={styles.heroPill}>
                      <MaterialCommunityIcons name={categoryIcon} size={12} color="#FFFFFF" />
                      <Text style={styles.heroPillText}>{categoryLabel}</Text>
                    </View>
                  )}
                  {accessLabel && (
                    <View style={styles.heroPill}>
                      <Text style={styles.heroPillText}>{accessLabel}</Text>
                    </View>
                  )}
                </View>
              )}
              <Text style={styles.heroName} numberOfLines={2}>{details.centerName}</Text>
              <View style={styles.ratingRow}>
                <MaterialCommunityIcons name="star" size={14} color={BrandColors.memberGold} />
                {hasRating ? (
                  <>
                    <Text style={styles.ratingValue}>{details.avgRating!.toFixed(1)}</Text>
                    <Text style={styles.ratingCount}>{t('centers.detail.reviews', { count: details.reviewCount })}</Text>
                  </>
                ) : (
                  <Text style={styles.ratingCount}>{t('centers.detail.noReviews')}</Text>
                )}
              </View>
            </View>

            {/* Image dots */}
            {images.length > 1 && (
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
            )}
          </View>
        </View>

        {/* Location + call */}
        <View style={styles.locRow}>
          <View style={styles.locInfo}>
            <Feather name="map-pin" size={18} color={BrandColors.teal} />
            <Text style={styles.locText} numberOfLines={1}>
              {area || t('centers.detail.location')}
              {distanceLabel ? <Text style={styles.locDistance}>{`  ·  ${distanceLabel}`}</Text> : null}
              {details.establishedYear != null ? (
                <Text style={styles.locMeta}>{`  ·  ${t('centers.detail.established', { year: details.establishedYear })}`}</Text>
              ) : null}
            </Text>
          </View>
          <Pressable
            onPress={handleCall}
            style={({ pressed }) => [styles.callPill, !details.phone && styles.disabled, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={t('centers.detail.callA11y')}
          >
            <Feather name="phone" size={14} color={BrandColors.teal} />
            <Text style={styles.callText}>{t('centers.detail.call')}</Text>
          </Pressable>
        </View>

        {/* Tabs — sticky. The wrapper reaches up under the status bar so the stuck tabs
            sit just below it, and its backdrop fades in only once they're stuck. */}
        <View
          style={[styles.tabsSticky, { paddingTop: insets.top + TAB_STICKY_GAP, marginTop: TAB_TOP_MARGIN - insets.top - TAB_STICKY_GAP }]}
          pointerEvents="box-none"
          onLayout={(e) => setTabsY(e.nativeEvent.layout.y)}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              styles.tabsBackdrop,
              {
                opacity: scrollY.interpolate({
                  inputRange: [tabsY - 12, tabsY],
                  outputRange: [0, 1],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          />
          <CenterDetailTabs activeTab={activeTab} onSelect={selectTab} />
        </View>

        {/* Tab content */}
        <Animated.View
          style={[
            styles.contentInner,
            {
              opacity: panelProgress.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] }),
              transform: [
                {
                  translateX: panelProgress.interpolate({
                    inputRange: [-1, 0, 1],
                    outputRange: [-PANEL_SLIDE, 0, PANEL_SLIDE],
                  }),
                },
                { scale: panelProgress.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.98, 1, 0.98] }) },
              ],
            },
          ]}
        >
          {activeTab === 'overview' && (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t('centers.detail.about')}</Text>
                <Text style={styles.bodyText}>{details.about || t('centers.detail.noAbout')}</Text>
              </View>

              <View style={styles.card}>
                <View style={styles.cardTitleRow}>
                  <Feather name="clock" size={18} color={BrandColors.teal} />
                  <Text style={[styles.cardTitle, styles.cardTitleInline]}>{t('centers.detail.timings')}</Text>
                </View>
                <Text style={styles.bodyText}>{details.operatingHours || t('centers.detail.noTimings')}</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t('centers.detail.facilities')}</Text>
                {details.amenities && details.amenities.length > 0 ? (
                  <View style={styles.chips}>
                    {details.amenities.map((fac) => (
                      <View key={fac.id || fac.facility_id} style={styles.chip}>
                        <Text style={styles.chipText}>{fac.name}</Text>
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
                  featured={plan.id === featuredPlanId}
                  onViewDetails={handlePreviewPlan}
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
                <View key={trainer.id} style={[styles.card, styles.trainerCard]}>
                  {resolveImageUrl(trainer.photoUrl) ? (
                    <Image source={{ uri: resolveImageUrl(trainer.photoUrl)! }} style={styles.trainerAvatar} />
                  ) : (
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
                  )}
                  <View style={styles.trainerInfo}>
                    <Text style={styles.trainerName} numberOfLines={1}>{trainer.name}</Text>
                    <Text style={styles.trainerSpecialty} numberOfLines={1}>
                      {trainer.department || trainer.role || t('centers.detail.trainerFallback')}
                    </Text>
                    {trainer.averageRating != null ? (
                      <View style={styles.trainerRatingRow}>
                        <MaterialCommunityIcons name="star" size={14} color={BrandColors.memberGold} />
                        <Text style={styles.trainerRatingValue}>{trainer.averageRating.toFixed(1)}</Text>
                        <Text style={styles.trainerRatingCount}>· {t('team.ratingCount', { count: trainer.ratingCount })}</Text>
                      </View>
                    ) : (
                      <Text style={[styles.trainerRatingCount, styles.trainerNotRated]}>{t('team.notRated')}</Text>
                    )}
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
                <Text style={styles.cardTitle}>{t('centers.detail.paymentOptions')}</Text>
                <View style={styles.paymentList}>
                  {PAYMENT_OPTIONS.map((opt) => {
                    const enabled = isMethodEnabled(opt.key);
                    return (
                      <View key={opt.key} style={[styles.paymentRow, enabled && styles.paymentRowOn]}>
                        <FeatherIcon name={opt.icon} size={16} color={enabled ? BrandColors.teal : PAYMENT_OFF_COLOR} />
                        <Text style={[styles.paymentLabel, enabled ? styles.paymentOnText : styles.paymentOffText]} numberOfLines={1}>
                          {tOr(`centers.paymentModes.${opt.key}`, opt.key)}
                          {opt.key === 'BNPL' && enabled && details.bnplProvider
                            ? t('centers.detail.viaProvider', { provider: details.bnplProvider })
                            : ''}
                        </Text>
                        <Text style={[styles.paymentStatus, enabled ? styles.paymentOnText : styles.paymentOffText]}>
                          {enabled ? t('centers.detail.accepted') : t('centers.detail.notAvailable')}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              <View style={styles.card}>
                <View style={styles.cardTitleRow}>
                  <Feather name="shield" size={18} color={BrandColors.teal} />
                  <Text style={[styles.cardTitle, styles.cardTitleInline]}>{t('centers.detail.terms')}</Text>
                </View>
                {branchTerms ? (
                  <TermsText terms={branchTerms} />
                ) : (
                  <Text style={styles.bodyText}>{t('centers.detail.noTerms')}</Text>
                )}
              </View>
            </>
          )}
        </Animated.View>
      </Animated.ScrollView>

      {/* Back button — floats above the page so it stays reachable while scrolling */}
      <Pressable
        hitSlop={8}
        onPress={handleBack}
        style={({ pressed }) => [styles.backButton, { top: insets.top + 12 }, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={t('centers.detail.goBack')}
      >
        <Feather name={I18nManager.isRTL ? 'chevron-right' : 'chevron-left'} size={22} color={BrandColors.textPrimary} />
      </Pressable>

      {/* Floating CTA */}
      <View
        style={[styles.ctaBar, { paddingBottom: 14 + insets.bottom }]}
        pointerEvents="box-none"
        onLayout={(e) => {
          const { height } = e.nativeEvent.layout;
          setCtaHeight((prev) => (prev === height ? prev : height));
        }}
      >
        <LinearGradient
          colors={['rgba(246,247,252,0)', PAGE_BG, PAGE_BG]}
          locations={[0, 0.3, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <Pressable
          onPress={handleBuyMembership}
          style={({ pressed }) => [styles.ctaWrapper, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={t('centers.detail.subscribeA11y', { name: details.centerName })}
        >
          <LinearGradient
            colors={[BrandColors.memberGold, BrandColors.trainerAmber]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
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

      <PlanDetailSheet
        plan={previewPlan}
        visible={isPlanDetailVisible}
        onClose={() => setIsPlanDetailVisible(false)}
        onSubscribe={handleSubscribeFromSheet}
        facilityNames={facilityNames}
      />

      <TermsAcceptSheet
        visible={!!termsPlan}
        terms={branchTerms}
        centerName={details.centerName}
        onClose={() => setTermsPlan(null)}
        onAccept={handleAcceptTerms}
      />
    </Animated.View>
  );
}

const CARD_SHADOW = {
  shadowColor: '#3C486E',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
} as const;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },

  // Hero
  hero: {
    backgroundColor: BrandColors.tealDark,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  heroBlob: {
    position: 'absolute',
    end: -70,
    top: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(248,203,82,0.22)',
  },
  backButton: {
    position: 'absolute',
    start: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    zIndex: 10,
    ...CARD_SHADOW,
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
  heroInfo: {
    position: 'absolute',
    start: 20,
    end: 20,
    bottom: 18,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.three,
  },
  heroInfoText: {
    flex: 1,
  },
  heroPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  heroPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  ratingValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ratingCount: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 5,
    paddingBottom: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: {
    width: 18,
    backgroundColor: '#F8CB52',
  },

  // Location row
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  locInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locText: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '500',
    color: MUTED,
  },
  locDistance: {
    fontWeight: '600',
    color: BrandColors.teal,
  },
  locMeta: {
    fontSize: 13,
    color: MUTED,
  },
  callPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: TEAL_SOFT,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  callText: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.teal,
  },

  // Sticky tabs
  tabsSticky: {
    paddingHorizontal: 16,
    paddingBottom: 6,
    zIndex: 5,
  },
  tabsBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: PAGE_BG,
  },

  // Tab content
  contentInner: {
    paddingTop: 10,
    paddingHorizontal: 16,
    gap: 14,
  },
  loader: {
    marginTop: Spacing.four,
  },
  card: {
    backgroundColor: BrandColors.surface,
    borderRadius: 24,
    padding: 20,
    ...CARD_SHADOW,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    marginBottom: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardTitleInline: {
    marginBottom: 0,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
    color: MUTED,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: TEAL_SOFT,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.teal,
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
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  trainerInfo: {
    flex: 1,
  },
  trainerName: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  trainerSpecialty: {
    fontSize: 13,
    color: MUTED,
    marginTop: 2,
  },
  trainerRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  trainerRatingValue: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  trainerRatingCount: {
    fontSize: 12,
    color: MUTED,
  },
  trainerNotRated: {
    marginTop: 6,
  },

  // Payment options
  paymentList: {
    gap: 8,
    marginTop: 2,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: PAGE_BG,
  },
  paymentRowOn: {
    backgroundColor: TEAL_SOFT,
  },
  paymentLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  paymentStatus: {
    fontSize: 14,
    fontWeight: '700',
  },
  paymentOnText: {
    color: BrandColors.teal,
  },
  paymentOffText: {
    color: PAYMENT_OFF_COLOR,
  },

  // Floating CTA
  ctaBar: {
    position: 'absolute',
    start: 0,
    end: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  ctaWrapper: {
    borderRadius: 20,
    shadowColor: BrandColors.trainerAmber,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  ctaButton: {
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(120,70,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
});
