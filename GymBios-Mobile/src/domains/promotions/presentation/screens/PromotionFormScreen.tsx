import React from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/shared/components/EmptyState';
import { Loader } from '@/shared/components/Loader';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import type { PromotionCampaignResponse } from '../../domain/PromotionCampaign';
import { usePromotion } from '../../hooks/usePromotions';
import { PromotionForm } from '../components/PromotionForm';

interface PromotionFormScreenProps {
  mode: 'create' | 'edit';
  promotionId?: number;
  initialData?: PromotionCampaignResponse;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PromotionFormScreen({
  mode,
  promotionId,
  initialData,
  onSuccess,
  onCancel,
}: PromotionFormScreenProps) {
  const {
    data: fetchedData,
    isLoading,
    isError,
    refetch,
  } = usePromotion(promotionId ?? 0);

  const effectiveData = initialData ?? fetchedData;

  if (mode === 'edit' && promotionId && isLoading && !effectiveData) {
    return (
      <ScreenLayout>
        <View style={styles.centerContainer}>
          <Loader />
        </View>
      </ScreenLayout>
    );
  }

  if (mode === 'edit' && promotionId && isError && !effectiveData) {
    return (
      <ScreenLayout>
        <View style={styles.centerContainer}>
          <EmptyState
            title="Promotion not found"
            description="Could not fetch promotion details for editing."
            buttonLabel="Try Again"
            onPress={() => refetch()}
          />
        </View>
      </ScreenLayout>
    );
  }

  return (
    <PromotionForm
      mode={mode}
      initialData={effectiveData}
      promotionId={promotionId}
      onSuccess={onSuccess}
      onCancel={onCancel}
    />
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
