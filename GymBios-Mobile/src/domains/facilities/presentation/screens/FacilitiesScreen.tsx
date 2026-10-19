import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/shared/components/AppHeader';
import { ScreenLayout, useTabBarBottomInset } from '@/shared/layouts/ScreenLayout';
import { SearchBar } from '@/shared/components/SearchBar';
import { Button } from '@/shared/components/Button';
import { Typography } from '@/shared/components/Typography';
import { BrandColors, Spacing } from '@/core/theme';
import { EmptyState } from '@/shared/components/EmptyState';
import { Loader } from '@/shared/components/Loader';

import { useFacilities } from '../../hooks/useFacilities';
import { useFacilityActions } from '../../hooks/useFacilityActions';
import { FacilityCard } from '../components/FacilityCard';
import { FacilityStats } from '../components/FacilityStats';
import { FacilityFilters, type FacilityStatusFilter } from '../components/FacilityFilters';
import type { Facility } from '../../domain/Facility';

const FACILITIES_COLORS: [string, string] = [BrandColors.teal, '#0f766e'];

export function FacilitiesScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const bottomInset = useTabBarBottomInset() + Spacing.six;

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<FacilityStatusFilter>('All');
  
  const apiStatus = status === 'All' ? undefined : status;
  
  const { data: facilities = [], isLoading, error, refetch, isRefetching } = useFacilities({
    search: search.length > 2 ? search : undefined, // search after 3 chars or handle on submit, let's keep it reactive
    status: apiStatus
  });

  const { deleteFacility, toggleStatus } = useFacilityActions();

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleEdit = (facility: Facility) => {
    router.push({
      pathname: '/(admin)/facilities/[id]/edit',
      params: { id: facility.id },
    });
  };

  const handleDelete = (facility: Facility) => {
    Alert.alert(
      t('facilities.deleteFacility', 'Delete Facility'),
      `Are you sure you want to delete ${facility.name}?`,
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        { 
          text: t('common.delete', 'Delete'), 
          style: 'destructive',
          onPress: () => deleteFacility.mutate(Number(facility.id))
        },
      ]
    );
  };

  const handleToggleStatus = (facility: Facility) => {
    toggleStatus.mutate(Number(facility.id));
  };

  const renderContent = () => {
    if (isLoading && !facilities.length) {
      return (
        <View style={styles.centerContainer}>
          <Loader />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Typography variant="body" color="error">{t('facilities.failedLoad')}</Typography>
          <Button label={t('facilities.retry')} onPress={() => refetch()} variant="secondary" style={{ marginTop: Spacing.two }} />
        </View>
      );
    }

    if (facilities.length === 0) {
      return (
        <EmptyState
          title={t('facilities.noFacilitiesFound')}
          description={search || apiStatus ? t('facilities.adjustFiltersHint') : t('facilities.addFirstHint')}
          icon="box"
          buttonLabel={t('facilities.clearFilters')}
          onPress={() => {
            setSearch('');
            setStatus('All');
          }}
        />
      );
    }

    return (
      <View style={styles.listContainer}>
        {facilities.map((facility) => (
          <FacilityCard
            key={facility.id}
            facility={facility}
            onEdit={handleEdit}
            onToggleStatus={handleToggleStatus}
            isToggling={toggleStatus.isPending}
          />
        ))}
      </View>
    );
  };

  return (
    <ScreenLayout>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomInset }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={BrandColors.teal}
          />
        }
      >
        <Button
          label={t('facilities.addFacility')}
          onPress={() => router.push('/(admin)/facilities/create')}
          style={styles.addButton}
        />

        <FacilityStats facilities={facilities} />

        <View style={styles.filtersSection}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder={t('facilities.searchPlaceholder')}
          />
          <FacilityFilters status={status} onChangeStatus={setStatus} />
        </View>

        {renderContent()}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.three,
    gap: Spacing.four,
  },
  addButton: {
    marginBottom: Spacing.one,
  },
  filtersSection: {
    gap: Spacing.two,
  },
  listContainer: {
    gap: Spacing.two,
  },
  centerContainer: {
    padding: Spacing.six,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
