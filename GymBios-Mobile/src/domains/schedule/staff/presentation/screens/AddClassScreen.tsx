import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/hooks';
import { BrandColors } from '@/core/theme';
import { AppHeader } from '@/shared/components';
import { StaffClassForm } from '../components/StaffClassForm';
import { useCreateStaffClass } from '../hooks/useStaffClasses';
import type { MobileStaffSessionRequestDTO } from '../../domain/StaffClassTypes';

export function AddClassScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  
  const createMutation = useCreateStaffClass();

  const handleSubmit = (values: MobileStaffSessionRequestDTO) => {
    createMutation.mutate(values, {
      onSuccess: () => {
        router.back();
      },
      onError: (error) => {
        Alert.alert(t('schedule.errorTitle'), t('schedule.staffClassForm.failedToCreateClass'));
        console.error('Failed to create staff class:', error);
      }
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <AppHeader
        title={t('schedule.staffClassForm.headerTitle')}
        colors={[BrandColors.teal, BrandColors.teal]}
        onBack={() => router.back()}
      />
      <StaffClassForm
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        isSubmitting={createMutation.isPending}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
