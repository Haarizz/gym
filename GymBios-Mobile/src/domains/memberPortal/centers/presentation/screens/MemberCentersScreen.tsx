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
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<CenterFilters>(DEFAULT_CENTER_FILTERS);
  const [sortBy, setSortBy] = useState('Distance');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const { data: centers = [], isLoading, isRefetching, refetch } = useCenters();
  const { coords, locationLabel, requestLocation } = useNearbyDistance();

  const goToDetail = (center: CenterSummary, tab: 'overview' | 'plans' = 'overview') => {
    router.push(`/(member)/centers/${center.tenantSlug}/${center.branchId}?tab=${tab}` as any);
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

  // Distance sort needs the device's coordinates before it can do anything —
  // request them lazily the first time the user actually asks for that sort,
  // rather than prompting for location permission on screen load.
  useEffect(() => {
    if (sortBy !== 'Distance' || coords) return;
    requestLocation().then((result) => {
      if (!result) {
        toast.warning('Enable location access to sort centers by distance.', { title: 'Location unavailable' });
      }
    });
  }, [sortBy, coords, requestLocation]);

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
    } else if (sortBy === 'Distance') {
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
    requestLocation().then((result) => {
      if (!result) {
        toast.warning('Enable location access to find centers near you.', { title: 'Location unavailable' });
      }
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
    filters.priceRange === 'under2k' ? 'Under ₹2k' : filters.priceRange === '2k-5k' ? '₹2k–₹5k' : 'Above ₹5k';

  return (
    <View style={styles.container}>
      {/* Hero search bar */}
      <LinearGradient colors={[BrandColors.teal, BrandColors.tealDark]} style={styles.hero}>
        <Text style={styles.heroTitle}>Find Wellness Centers</Text>
        <Text style={styles.heroSubtitle}>Discover gyms, studios & wellness hubs near you</Text>

        <View style={styles.searchBar}>
          <Feather name="search" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, area, or type..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable hitSlop={8} onPress={() => setSearchQuery('')}>
              <Feather name="x" size={16} color="#9CA3AF" />
            </Pressable>
          )}
        </View>

        <View style={styles.heroActionsRow}>
          <Pressable
            style={[styles.locationButton, locationLabel && styles.locationButtonActive]}
            onPress={handleUseMyLocation}
          >
            <Feather
              name="navigation"
              size={14}
              color={locationLabel ? BrandColors.teal : '#FFFFFF'}
            />
            <Text
              style={[styles.locationButtonText, locationLabel && styles.locationButtonTextActive]}
              numberOfLines={1}
            >
              {locationLabel || 'Use My Location'}
            </Text>
          </Pressable>

          <Pressable 
            style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]} 
            onPress={() => setIsFiltersOpen(true)}
          >
            <Feather name="sliders" size={14} color="#FFFFFF" />
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
      </LinearGradient>

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
        contentContainerStyle={styles.scrollListContent}
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
          <Text style={styles.resultCountText}>
            <Text style={styles.resultCountNumber}>{filteredCenters.length}</Text> centers
            {locationLabel ? ` near ${locationLabel}` : ' available'}
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
  hero: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four + 2,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
  },
  heroTitle: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  heroSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: Spacing.four,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.surface,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.md,
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  searchInput: {
    flex: 1,
    fontSize: TypographyScale.body,
    color: BrandColors.textPrimary,
    paddingVertical: 0,
  },
  heroActionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  locationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  locationButtonActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  locationButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  locationButtonTextActive: {
    color: BrandColors.teal,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  filterButtonActive: {
    backgroundColor: BrandColors.memberGold,
    borderColor: BrandColors.memberGold,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  filterCountBadge: {
    backgroundColor: '#FFFFFF',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: BrandColors.trainerAmber,
  },
  activeFiltersBar: {
    backgroundColor: BrandColors.surface,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: Spacing.two + 2,
  },
  activeFiltersScroll: {
    paddingHorizontal: Spacing.four,
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
    padding: Spacing.four,
    paddingBottom: Spacing.six + 50,
  },
  resultCountRow: {
    marginBottom: Spacing.three,
  },
  resultCountText: {
    fontSize: TypographyScale.small,
    fontWeight: '600',
    color: BrandColors.textSecondary,
  },
  resultCountNumber: {
    fontWeight: '800',
    color: BrandColors.textPrimary,
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
