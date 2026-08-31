import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@/core/hooks';
import { BrandColors } from '@/core/theme';
import { AppHeader } from '@/shared/components';
import { StaffClassForm } from '../components/StaffClassForm';
import { useCreateStaffClass } from '../hooks/useStaffClasses';
import type { MobileStaffSessionRequestDTO } from '../../domain/StaffClassTypes';

export function AddClassScreen() {
  const theme = useTheme();
  const router = useRouter();
  
  const createMutation = useCreateStaffClass();

  const handleSubmit = (values: MobileStaffSessionRequestDTO) => {
    createMutation.mutate(values, {
      onSuccess: () => {
        router.back();
      },
      onError: (error) => {
        Alert.alert('Error', 'Failed to create class. Please try again.');
        console.error('Failed to create staff class:', error);
      }
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <AppHeader
        title="Add New Class"
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
