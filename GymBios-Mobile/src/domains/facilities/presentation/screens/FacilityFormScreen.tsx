import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/shared/components/AppHeader';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { Loader } from '@/shared/components/Loader';
import { Typography } from '@/shared/components/Typography';
import { BrandColors, Spacing } from '@/core/theme';

import { useFacilityActions } from '../../hooks/useFacilityActions';
import { FacilityForm } from '../components/FacilityForm';
import { ApiFacilityRepository } from '../../infrastructure/ApiFacilityRepository';
import type { Facility, FacilityRequest } from '../../domain/Facility';

const FACILITIES_COLORS: [string, string] = [BrandColors.teal, '#0f766e'];
const repository = new ApiFacilityRepository();

export function FacilityFormScreen({ mode }: { mode: 'create' | 'edit' }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id?: string }>();
  
  const { createFacility, updateFacility } = useFacilityActions();
  
  const [initialData, setInitialData] = useState<Facility | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(mode === 'edit');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'edit' && id) {
      repository.getFacilities().then(facilities => {
        const facility = facilities.find(f => f.id === id || String(f.id) === id);
        if (facility) {
          setInitialData(facility);
        } else {
          setError(t('facilities.notFound'));
        }
        setIsLoading(false);
      }).catch(err => {
        setError(err.message || t('facilities.failedLoadSingle'));
        setIsLoading(false);
      });
    }
  }, [mode, id, t]);

  const handleSubmit = (request: FacilityRequest) => {
    if (mode === 'create') {
      createFacility.mutate(request, {
        onSuccess: () => {
          router.back();
        },
      });
    } else if (mode === 'edit' && id) {
      updateFacility.mutate({ id: Number(id), request }, {
        onSuccess: () => {
          router.back();
        },
      });
    }
  };

  const isSubmitting = createFacility.isPending || updateFacility.isPending;

  return (
    <ScreenLayout>
      <AppHeader
        title={mode === 'create' ? t('facilities.addFacility') : t('facilities.editFacility')}
        subtitle={t('facilities.subtitle')}
        colors={FACILITIES_COLORS}
        onBack={() => router.back()}
      />
      
      {isLoading ? (
        <View style={styles.centerContainer}>
          <Loader />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Typography variant="body" color="error">{error}</Typography>
        </View>
      ) : (
        <FacilityForm
          initialData={initialData}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.six,
  },
});
