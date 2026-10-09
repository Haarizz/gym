import { useMemo, useState, useEffect, useRef } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { CurrencyValue } from '@/core/providers';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandColors, Glass, Radius, Spacing, TypographyScale, heroTint } from '@/core/theme';
import { GlassBlob, GlassSurface } from '@/shared/components';
import { TAB_BAR_HEIGHT } from '@/shared/layouts/ScreenLayout';
import { toast } from '@/shared/components/Toasts/toastStore';
import { CenterCard } from '../components/CenterCard';
import { CenterFiltersModal, DEFAULT_CENTER_FILTERS, type CenterFilters } from '../components/CenterFiltersModal';
import { useCenters, type CenterSummary } from '@/domains/discovery';
import { useNearbyDistance } from '../hooks/useNearbyDistance';
import { getDistanceKm } from '../../utils/distance';

export function MemberCentersScreen({
  initialDeepLink,
}: {
  initialDeepLink?: { tenantSlug: string; branchId: string };
} = {}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<CenterFilters>(DEFAULT_CENTER_FILTERS);
  const [sortBy, setSortBy] = useState('Distance');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const { data: centers = [], isLoading, isRefetching, refetch } = useCenters();
  const { coords, locationLabel, isLocating, requestLocation, clearLocation } = useNearbyDistance();
  const isLocationOn = coords != null;

  const goToDetail = (center: CenterSummary, tab: 'overview' | 'plans' = 'overview') => {
    // Location only lives on this screen, so hand the already-computed distance to
    // the detail page's stats bar rather than asking for location again there.
    const km =
      coords && center.lat != null && center.lng != null
        ? getDistanceKm(coords.latitude, coords.longitude, center.lat, center.lng)
        : null;
    const distanceParam = km != null ? `&distance=${km.toFixed(1)}` : '';
    router.push(`/(member)/centers/${center.tenantSlug}/${center.branchId}?tab=${tab}${distanceParam}` as any);
  };

  // Idempotent deep-link resolution — navigates to the full detail page the
  // first time a deep link arrives. Guarded by a ref (not state) so it fires
  // exactly once per link, without waiting on the centers list to load first.
  const handledDeepLinkRef = useRef<string | null>(null);
  useEffect(() => {
    if (!initialDeepLink) return;
    const linkKey = `${initialDeepLink.tenantSlug}/${initialDeepLink.branchId}`;
    if (handledDeepLinkRef.current === linkKey) return;
    handledDeepLinkRef.current = linkKey;
    router.push(`/(member)/centers/${initialDeepLink.tenantSlug}/${initialDeepLink.branchId}?tab=overview` as any);
  }, [initialDeepLink, router]);

  const filteredCenters = useMemo(() => {
    const filtered = centers.filter((center) => {
      const matchesSearch =
        (center.centerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (center.address || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = filters.category === 'All' || center.centerType === filters.category;

      const matchesPrice =
        !filters.priceRange ||
        (center.startingPrice != null &&
          (filters.priceRange === 'under2k'
            ? center.startingPrice < 2000
            : filters.priceRange === '2k-5k'
            ? center.startingPrice >= 2000 && center.startingPrice <= 5000
            : center.startingPrice > 5000));

      const matchesAccess = !filters.accessType || center.accessType === filters.accessType;

      const matchesPayment =
        !filters.paymentMode || center.acceptedPaymentMethods.includes(filters.paymentMode);

      return matchesSearch && matchesCategory && matchesPrice && matchesAccess && matchesPayment;
    });

    const distanceKm = (center: CenterSummary): number | null =>
      coords && center.lat != null && center.lng != null
        ? getDistanceKm(coords.latitude, coords.longitude, center.lat, center.lng)
        : null;

    const sorted = [...filtered];
    if (sortBy === 'Price') {
      sorted.sort((a, b) => {
        if (a.startingPrice == null) return b.startingPrice == null ? 0 : 1;
        if (b.startingPrice == null) return -1;
        return a.startingPrice - b.startingPrice;
      });
    } else if (sortBy === 'Distance' && coords) {
      // Location is only requested from the "Use My Location" button, so until
      // then there are no coordinates and the list keeps its original order.
      sorted.sort((a, b) => {
        const da = distanceKm(a);
        const db = distanceKm(b);
        if (da == null) return db == null ? 0 : 1;
        if (db == null) return -1;
        return da - db;
      });
    } else if (sortBy === 'Rating') {
      sorted.sort((a, b) => {
        if (a.avgRating == null) return b.avgRating == null ? 0 : 1;
        if (b.avgRating == null) return -1;
        return b.avgRating - a.avgRating;
      });
    }

    return sorted;
  }, [centers, searchQuery, filters, sortBy, coords]);

  const handleViewDetails = (center: CenterSummary) => {
    // Deliberately NOT calling setActiveTenant here. This screen is the public
    // marketplace browse/search list of every center on the platform — tapping
    // a card to view its details is not proof of membership there, and blindly
    // switching X-Tenant-ID to whatever card was tapped would send every
    // subsequent request (dashboard, my-branches, status...) under a gym the
    // member may have no relationship with, which the backend then correctly
    // 403s as "not a member of this Gym". The active tenant is established
    // for real in two places only: restoreActiveTenantForUser (login/session
    // restore, from this user's own persisted value) and PlanPurchaseModal's
    // purchase onSuccess (after the backend confirms membership was created).
    goToDetail(center, 'overview');
  };

  const handleBuyMembership = (center: CenterSummary) => {
    goToDetail(center, 'plans');
  };

  const handleUseMyLocation = () => {
    if (isLocating) return;
    // Second tap turns the in-app location off — the list falls back to its
    // original order and distances disappear from the cards.
    if (isLocationOn) {
      clearLocation();
      return;
    }
    requestLocation().then((result) => {
      if (!result) {
        toast.warning('Enable location access to find centers near you.', { title: 'Location unavailable' });
        return;
      }
      // Closest centers first once we know where the user is.
      setSortBy('Distance');
    });
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_CENTER_FILTERS);
    setSortBy('Distance');
  };

  const handleRefresh = async () => {
    await refetch();
  };

  const activeFilterCount =
    (filters.category !== 'All' ? 1 : 0) +
    (filters.priceRange ? 1 : 0) +
    (filters.accessType ? 1 : 0) +
    (filters.paymentMode ? 1 : 0);

  const priceRangeLabel =
    filters.priceRange === 'under2k' ? (
      <>Under <CurrencyValue amount={2000} compact /></>
    ) : filters.priceRange === '2k-5k' ? (
      <><CurrencyValue amount={2000} compact />–<CurrencyValue amount={5000} compact /></>
    ) : (
      <>Above <CurrencyValue amount={5000} compact /></>
    );

  return (
    <View style={styles.container}>
      {/* Colour wash behind the glass panels, same recipe as the member dashboard */}
      <View style={styles.blobLayer} pointerEvents="none">
        <GlassBlob color={BrandColors.memberGold} size={340} opacity={0.42} top={-90} right={-60} />
        <GlassBlob color={BrandColors.teal} size={260} opacity={0.22} top={140} left={-110} />
      </View>

      {/* Search + actions */}
      <View style={styles.controls}>
        <GlassSurface strong radius={Radius.lg} style={styles.searchBar}>
          <Feather name="search" size={18} color={BrandColors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, area, or type..."
            placeholderTextColor="#7A8684"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable hitSlop={8} onPress={() => setSearchQuery('')}>
              <Feather name="x" size={16} color="#7A8684" />
            </Pressable>
          )}
        </GlassSurface>

        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.locationButton,
              isLocationOn && styles.locationButtonActive,
              pressed && styles.pressed,
            ]}
            onPress={handleUseMyLocation}
            accessibilityRole="button"
            accessibilityState={{ selected: isLocationOn, busy: isLocating }}
          >
            {isLocating ? (
              <ActivityIndicator size="small" color={isLocationOn ? BrandColors.teal : '#FFFFFF'} />
            ) : (
              <Feather
                name="navigation"
                size={15}
                color={isLocationOn ? BrandColors.teal : '#FFFFFF'}
              />
            )}
            <Text
              style={[styles.locationButtonText, isLocationOn && styles.locationButtonTextActive]}
              numberOfLines={1}
            >
              {isLocationOn ? locationLabel || 'Near Me' : 'Use My Location'}
            </Text>
            {isLocationOn && <Feather name="x" size={14} color={BrandColors.teal} />}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.filterButton,
              activeFilterCount > 0 && styles.filterButtonActive,
              pressed && styles.pressed,
            ]}
            onPress={() => setIsFiltersOpen(true)}
          >
            <Feather name="sliders" size={15} color={activeFilterCount > 0 ? '#FFFFFF' : BrandColors.tealDark} />
            <Text style={[styles.filterButtonText, activeFilterCount > 0 && styles.filterButtonTextActive]}>
              Filters
            </Text>
            {activeFilterCount > 0 && (
              <View style={styles.filterCountBadge}>
                <Text style={styles.filterCountText}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <View style={styles.activeFiltersBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeFiltersScroll}>
            {filters.category !== 'All' && (
              <View style={[styles.activeChip, styles.activeChipTeal]}>
                <Text style={[styles.activeChipText, styles.activeChipTextTeal]}>{filters.category}</Text>
                <Pressable onPress={() => setFilters((f) => ({ ...f, category: 'All' }))} hitSlop={6}>
                  <Feather name="x" size={12} color={BrandColors.teal} />
                </Pressable>
              </View>
            )}
            {filters.accessType && (
              <View style={[styles.activeChip, styles.activeChipPink]}>
                <Text style={[styles.activeChipText, styles.activeChipTextPink]}>{filters.accessType}</Text>
                <Pressable onPress={() => setFilters((f) => ({ ...f, accessType: '' }))} hitSlop={6}>
                  <Feather name="x" size={12} color="#BE185D" />
                </Pressable>
              </View>
            )}
            {filters.priceRange && (
              <View style={[styles.activeChip, styles.activeChipGold]}>
                <Text style={[styles.activeChipText, styles.activeChipTextGold]}>{priceRangeLabel}</Text>
                <Pressable onPress={() => setFilters((f) => ({ ...f, priceRange: '' }))} hitSlop={6}>
                  <Feather name="x" size={12} color={BrandColors.trainerAmber} />
                </Pressable>
              </View>
            )}
            {filters.paymentMode && (
              <View style={[styles.activeChip, styles.activeChipNeutral]}>
                <Text style={[styles.activeChipText, styles.activeChipTextNeutral]}>{filters.paymentMode}</Text>
                <Pressable onPress={() => setFilters((f) => ({ ...f, paymentMode: '' }))} hitSlop={6}>
                  <Feather name="x" size={12} color={BrandColors.textSecondary} />
                </Pressable>
              </View>
            )}
            <Pressable onPress={handleResetFilters}>
              <Text style={styles.clearAllText}>Clear all</Text>
            </Pressable>
          </ScrollView>
        </View>
      )}

      {/* Centers List */}
      <ScrollView
        style={styles.scrollList}
        contentContainerStyle={[
          styles.scrollListContent,
          { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 24 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={BrandColors.teal}
            colors={[BrandColors.teal]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.resultCountRow}>
          <Text style={styles.resultCountTitle} numberOfLines={1}>
            {locationLabel ? `Centers near ${locationLabel}` : 'Wellness centers near you'}
          </Text>
          <Text style={styles.resultCountText}>
            {filteredCenters.length} available
          </Text>
        </View>

        {isLoading && !isRefetching ? (
          <ActivityIndicator size="large" color={BrandColors.teal} style={{ marginTop: 40 }} />
        ) : filteredCenters.length > 0 ? (
          filteredCenters.map((center) => (
            <CenterCard
              key={`${center.tenantSlug}-${center.branchId}`}
              center={center}
              onViewDetails={handleViewDetails}
              onBuyMembership={handleBuyMembership}
              distanceKm={
                coords && center.lat != null && center.lng != null
                  ? getDistanceKm(coords.latitude, coords.longitude, center.lat, center.lng)
                  : undefined
              }
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Feather name="map-pin" size={32} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No centers found</Text>
            <Text style={styles.emptyDesc}>Try adjusting your search query or filters.</Text>
          </View>
        )}
      </ScrollView>

      {/* Filters Modal */}
      <CenterFiltersModal
        visible={isFiltersOpen}
        filters={filters}
        sortBy={sortBy}
        onChangeFilters={setFilters}
        onSelectSort={setSortBy}
        onReset={handleResetFilters}
        onClose={() => setIsFiltersOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  blobLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 420,
    overflow: 'hidden',
  },
  controls: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.md + 2,
    paddingBottom: Spacing.two,
    gap: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: BrandColors.textPrimary,
    paddingVertical: 0,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.85,
  },
  locationButton: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.md,
    borderRadius: 14,
    backgroundColor: heroTint(BrandColors.teal, 0.9),
    borderWidth: 1,
    borderColor: Glass.border,
  },
  locationButtonActive: {
    backgroundColor: Glass.fillStrong,
    borderColor: heroTint(BrandColors.teal, 0.5),
  },
  locationButtonText: {
    fontSize: TypographyScale.body,
    fontWeight: '700',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  locationButtonTextActive: {
    color: BrandColors.teal,
  },
  filterButton: {
    minWidth: 108,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.md,
    borderRadius: 14,
    backgroundColor: Glass.fillStrong,
    borderWidth: 1,
    borderColor: Glass.border,
  },
  filterButtonActive: {
    backgroundColor: heroTint(BrandColors.trainerAmber, 0.9),
  },
  filterButtonText: {
    fontSize: TypographyScale.body,
    fontWeight: '700',
    color: BrandColors.tealDark,
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  filterCountBadge: {
    backgroundColor: '#FFFFFF',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: BrandColors.trainerAmber,
  },
  activeFiltersBar: {
    paddingBottom: Spacing.two,
  },
  activeFiltersScroll: {
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    gap: Spacing.two,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  activeChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  activeChipTeal: {
    backgroundColor: '#F0FDFA',
  },
  activeChipTextTeal: {
    color: BrandColors.teal,
  },
  activeChipPink: {
    backgroundColor: '#FCE7F3',
  },
  activeChipTextPink: {
    color: '#BE185D',
  },
  activeChipGold: {
    backgroundColor: 'rgba(245, 199, 66, 0.15)',
  },
  activeChipTextGold: {
    color: BrandColors.trainerAmber,
  },
  activeChipNeutral: {
    backgroundColor: '#F1F5F9',
  },
  activeChipTextNeutral: {
    color: BrandColors.textPrimary,
  },
  clearAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.danger,
  },
  scrollList: {
    flex: 1,
  },
  scrollListContent: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  resultCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginBottom: Spacing.md,
  },
  resultCountTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  resultCountText: {
    fontSize: 13,
    color: BrandColors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six * 2,
    gap: Spacing.two,
  },
  emptyTitle: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  emptyDesc: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    textAlign: 'center',
  },
});
