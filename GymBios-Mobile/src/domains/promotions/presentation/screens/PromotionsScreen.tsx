import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { BrandColors, Spacing } from '@/core/theme';
import { Button } from '@/shared/components/Button';
import { EmptyState } from '@/shared/components/EmptyState';
import { Loader } from '@/shared/components/Loader';
import { Typography } from '@/shared/components/Typography';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import type { PromotionCampaignResponse } from '../../domain/PromotionCampaign';
import { usePromotions } from '../../hooks/usePromotions';
import { PromotionCard } from '../components/PromotionCard';
import { PromotionDetailsSheet } from '../components/PromotionDetailsSheet';
import {
  DEFAULT_PROMOTION_FILTERS,
  PromotionFilterSheet,
  type PromotionFilterState,
} from '../components/PromotionFilterSheet';
import { PromotionSearch } from '../components/PromotionSearch';
import { PromotionStatisticsCard } from '../components/PromotionStatisticsCard';
import { PromotionTabs, type PromotionTabType } from '../components/PromotionTabs';
import { calculatePromotionStatistics } from '../utils/promotionStatistics';

interface PromotionsScreenProps {
  onNavigateToCreate: () => void;
  onNavigateToEdit: (promotion: PromotionCampaignResponse) => void;
}

export function PromotionsScreen({
  onNavigateToCreate,
  onNavigateToEdit,
}: PromotionsScreenProps) {
  const { width } = useWindowDimensions();
  const numColumns = width >= 600 ? 2 : 1;

  const [activeTab, setActiveTab] = useState<PromotionTabType>('promotions');
  const [search, setSearch] = useState('');
  const [filterState, setFilterState] =
    useState<PromotionFilterState>(DEFAULT_PROMOTION_FILTERS);
  const [isFilterSheetVisible, setIsFilterSheetVisible] = useState(false);
  const [selectedPromotion, setSelectedPromotion] =
    useState<PromotionCampaignResponse | null>(null);

  const { data: promotions, isLoading, isError, refetch } = usePromotions();

  const hasActiveFilters =
    filterState.status !== 'all' ||
    filterState.type !== 'all' ||
    filterState.category !== 'all';

  const filteredPromotions = useMemo(() => {
    let result: PromotionCampaignResponse[] = promotions || [];

    // Filter by status
    if (filterState.status !== 'all') {
      result = result.filter(
        (p: PromotionCampaignResponse) =>
          p.status?.toLowerCase() === filterState.status.toLowerCase(),
      );
    }

    // Filter by type
    if (filterState.type !== 'all') {
      result = result.filter(
        (p: PromotionCampaignResponse) =>
          p.type?.toLowerCase() === filterState.type.toLowerCase(),
      );
    }

    // Filter by category
    if (filterState.category !== 'all') {
      result = result.filter(
        (p: PromotionCampaignResponse) =>
          p.category?.toLowerCase() === filterState.category.toLowerCase(),
      );
    }

    // Local Search filtering
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (p: PromotionCampaignResponse) =>
          p.name?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.code?.toLowerCase().includes(q) ||
          p.tags?.some((t: string) => t.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [promotions, filterState, search]);

  const statistics = useMemo(
    () => calculatePromotionStatistics(promotions || []),
    [promotions],
  );

  const handleCardPress = useCallback((promotion: PromotionCampaignResponse) => {
    setSelectedPromotion(promotion);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSelectedPromotion(null);
  }, []);

  const renderPromotionItem = useCallback(
    ({ item }: { item: PromotionCampaignResponse }) => (
      <View style={numColumns > 1 ? styles.gridColumn : styles.singleColumn}>
        <PromotionCard promotion={item} onPress={handleCardPress} />
      </View>
    ),
    [numColumns, handleCardPress],
  );

  const renderHeader = useCallback(
    () => (
      <View style={styles.headerContainer}>
        {/* Top Header Row */}
        <View style={styles.headerRow}>
          <View style={styles.headerTextGroup}>
            <Typography variant="title" style={styles.screenTitle}>
              Promotions & Campaigns
            </Typography>
          </View>
          <Button
            label="+ Create"
            onPress={onNavigateToCreate}
            size="md"
          />
        </View>

        {/* Tab Switcher */}
        <PromotionTabs
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          promotionsCount={promotions?.length}
        />

        {/* Search & Filter (Only visible in Promotions tab) */}
        {activeTab === 'promotions' && (
          <PromotionSearch
            value={search}
            onChangeText={setSearch}
            onOpenFilter={() => setIsFilterSheetVisible(true)}
            hasActiveFilters={hasActiveFilters}
          />
        )}
      </View>
    ),
    [activeTab, search, hasActiveFilters, promotions, onNavigateToCreate],
  );

  if (isLoading) {
    return (
      <ScreenLayout>
        {renderHeader()}
        <View style={styles.centerContainer}>
          <Loader />
        </View>
      </ScreenLayout>
    );
  }

  if (isError) {
    return (
      <ScreenLayout>
        {renderHeader()}
        <View style={styles.centerContainer}>
          <EmptyState
            title="Failed to load promotions"
            description="An error occurred while fetching promotions from server."
            buttonLabel="Try Again"
            onPress={() => refetch()}
          />
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <View style={styles.container}>
        {activeTab === 'promotions' ? (
          <FlatList
            key={numColumns}
            data={filteredPromotions}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderPromotionItem}
            numColumns={numColumns}
            ListHeaderComponent={renderHeader}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={refetch}
                colors={[BrandColors.teal]}
                tintColor={BrandColors.teal}
              />
            }
            ListEmptyComponent={
              search || hasActiveFilters ? (
                <EmptyState
                  title="No matching promotions"
                  description="Try adjusting your search query or clear existing filters."
                  buttonLabel="Clear Filters"
                  onPress={() => {
                    setSearch('');
                    setFilterState(DEFAULT_PROMOTION_FILTERS);
                  }}
                />
              ) : (
                <EmptyState
                  title="No promotions yet"
                  description="Create your first promotional campaign to boost member engagement."
                  buttonLabel="Create Promotion"
                  onPress={onNavigateToCreate}
                />
              )
            }
          />
        ) : (
          <FlatList
            data={[]}
            renderItem={() => null}
            ListHeaderComponent={
              <View>
                {renderHeader()}
                {/* Statistics Grid */}
                <View style={styles.statisticsContainer}>
                  <View style={styles.statRow}>
                    <PromotionStatisticsCard
                      title="Total"
                      value={statistics.totalPromotions}
                      iconName="tag"
                      iconColor="#0284C7"
                      iconBgColor="#E0F2FE"
                    />
                    <PromotionStatisticsCard
                      title="Active"
                      value={statistics.activePromotions}
                      iconName="check-circle"
                      iconColor="#15803D"
                      iconBgColor="#DCFCE7"
                    />
                  </View>

                  <View style={styles.statRow}>
                    <PromotionStatisticsCard
                      title="Expired"
                      value={statistics.expiredPromotions}
                      iconName="x-circle"
                      iconColor="#B91C1C"
                      iconBgColor="#FEE2E2"
                    />
                    <PromotionStatisticsCard
                      title="Redemptions"
                      value={statistics.totalRedemptions}
                      iconName="target"
                      iconColor="#7E22CE"
                      iconBgColor="#F3E8FF"
                    />
                  </View>

                  <View style={styles.statRow}>
                    <PromotionStatisticsCard
                      title="Total Revenue"
                      value={`$${statistics.totalRevenue.toLocaleString()}`}
                      iconName="dollar-sign"
                      iconColor="#059669"
                      iconBgColor="#ECFDF5"
                    />
                    <PromotionStatisticsCard
                      title="Total Savings"
                      value={`$${statistics.totalSavings.toLocaleString()}`}
                      iconName="zap"
                      iconColor="#EA580C"
                      iconBgColor="#FFEDD5"
                    />
                  </View>

                  <View style={styles.statRow}>
                    <PromotionStatisticsCard
                      title="Conversion"
                      value={`${statistics.conversionRate}%`}
                      iconName="trending-up"
                      iconColor="#2563EB"
                      iconBgColor="#EFF6FF"
                    />
                    <PromotionStatisticsCard
                      title="Growth"
                      value={`${statistics.growth >= 0 ? '+' : ''}${statistics.growth}%`}
                      iconName="arrow-up-right"
                      iconColor="#4F46E5"
                      iconBgColor="#EEF2FF"
                      subtitle="new promos vs last mo"
                    />
                  </View>
                </View>
              </View>
            }
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={refetch}
                colors={[BrandColors.teal]}
                tintColor={BrandColors.teal}
              />
            }
          />
        )}

        {/* Filter Sheet */}
        <PromotionFilterSheet
          visible={isFilterSheetVisible}
          filters={filterState}
          onClose={() => setIsFilterSheetVisible(false)}
          onApplyFilters={setFilterState}
          onResetFilters={() => setFilterState(DEFAULT_PROMOTION_FILTERS)}
        />

        {/* Promotion Details Bottom Sheet */}
        <PromotionDetailsSheet
          visible={!!selectedPromotion}
          promotion={selectedPromotion}
          onClose={handleCloseSheet}
          onEdit={onNavigateToEdit}
        />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingTop: Spacing.four,
    paddingBottom: Spacing.one,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.three,
  },
  headerTextGroup: {
    flex: 1,
    paddingRight: Spacing.two,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  listContent: {
    paddingBottom: Spacing.six,
  },
  singleColumn: {
    paddingHorizontal: Spacing.four,
  },
  gridColumn: {
    flex: 1,
    paddingHorizontal: Spacing.two,
  },
  statisticsContainer: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  statRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
});
