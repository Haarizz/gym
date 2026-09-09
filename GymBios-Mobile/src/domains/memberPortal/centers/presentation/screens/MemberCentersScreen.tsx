import { useMemo, useState } from 'react';
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
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { GlassBlob } from '@/shared/components';
import { CenterCard } from '../components/CenterCard';
import { CenterDetailModal } from '../components/CenterDetailModal';
import { CenterFiltersModal } from '../components/CenterFiltersModal';
import { useCenters, type CenterSummary } from '@/domains/discovery';

const CATEGORY_TABS = ['All', 'Gym', 'Fitness Center', 'Wellness Center', 'Studio'];

export function MemberCentersScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedGender, setSelectedGender] = useState('All');
  const [sortBy, setSortBy] = useState('Rating'); // Kept for UI compatibility, even without rating
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState<CenterSummary | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { data: centers = [], isLoading, isRefetching, refetch } = useCenters();

  const filteredCenters = useMemo(() => {
    return centers.filter((center) => {
      const matchesSearch =
        (center.centerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (center.address || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat =
        selectedCategory === 'All' || center.centerType === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [centers, searchQuery, selectedCategory, selectedGender, sortBy]);

  const handleCenterPress = (center: CenterSummary) => {
    setSelectedCenter(center);
    setIsDetailOpen(true);
  };

  const handleResetFilters = () => {
    setSelectedCategory('All');
    setSelectedGender('All');
    setSortBy('Rating');
  };

  const handleRefresh = async () => {
    await refetch();
  };

  return (
    <View style={styles.container}>
      <GlassBlob color={BrandColors.teal} size={340} opacity={0.4} top={-90} right={-60} />
      <GlassBlob color={BrandColors.tealDark} size={300} opacity={0.28} top={340} left={-70} />
      <GlassBlob color={BrandColors.memberGold} size={240} opacity={0.2} top={760} right={-70} />
      {/* Search & Filter Header */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color={BrandColors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search gym, area, or location..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable hitSlop={8} onPress={() => setSearchQuery('')}>
              <Feather name="x" size={16} color={BrandColors.textSecondary} />
            </Pressable>
          )}
        </View>

        <Pressable
          style={styles.filterButton}
          onPress={() => setIsFiltersOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Open Filters"
        >
          <Feather name="sliders" size={18} color={BrandColors.teal} />
        </Pressable>
      </View>

      {/* Category Chips Bar */}
      <View style={styles.categoryBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORY_TABS.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <Pressable
                key={cat}
                style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    isSelected && styles.categoryChipTextSelected,
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

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
            Showing {filteredCenters.length} centers
          </Text>
        </View>

        {isLoading && !isRefetching ? (
          <ActivityIndicator size="large" color={BrandColors.teal} style={{ marginTop: 40 }} />
        ) : filteredCenters.length > 0 ? (
          filteredCenters.map((center) => (
            <CenterCard key={`${center.tenantSlug}-${center.branchId}`} center={center} onPress={handleCenterPress} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Feather name="map-pin" size={32} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No centers found</Text>
            <Text style={styles.emptyDesc}>Try adjusting your search query or filters.</Text>
          </View>
        )}
      </ScrollView>

      {/* Detail Modal */}
      {selectedCenter && (
        <CenterDetailModal
          visible={isDetailOpen}
          center={selectedCenter}
          onClose={() => setIsDetailOpen(false)}
        />
      )}

      {/* Filters Modal */}
      <CenterFiltersModal
        visible={isFiltersOpen}
        selectedCategory={selectedCategory}
        selectedGender={selectedGender}
        sortBy={sortBy}
        onSelectCategory={setSelectedCategory}
        onSelectGender={setSelectedGender}
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
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.surface,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: Spacing.two,
  },
  searchInput: {
    flex: 1,
    fontSize: TypographyScale.body,
    color: BrandColors.textPrimary,
    paddingVertical: 0,
  },
  filterButton: {
    padding: Spacing.two + 3,
    borderRadius: Radius.md,
    backgroundColor: BrandColors.surface,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBar: {
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryScroll: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  categoryChip: {
    paddingHorizontal: Spacing.three + 2,
    paddingVertical: Spacing.one + 3,
    borderRadius: Radius.full,
    backgroundColor: BrandColors.surface,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipSelected: {
    backgroundColor: BrandColors.teal,
    borderColor: BrandColors.teal,
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.textSecondary,
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
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
