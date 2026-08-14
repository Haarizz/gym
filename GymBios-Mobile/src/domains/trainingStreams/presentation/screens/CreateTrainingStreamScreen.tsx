import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { AppHeader } from '@/shared/components/AppHeader';
import { BrandColors } from '@/core/theme';

import { TrainingStreamForm } from '../components/TrainingStreamForm';
import { useCreateTrainingStream } from '../../hooks/useTrainingStreamActions';
import type { CreateTrainingStreamRequest } from '../../application/TrainingStreamRepository';

export function CreateTrainingStreamScreen() {
  const router = useRouter();
  const mutation = useCreateTrainingStream();

  const handleSubmit = async (values: CreateTrainingStreamRequest) => {
    try {
      await mutation.mutateAsync(values);
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create stream');
    }
  };

  return (
    <ScreenLayout>
      <AppHeader
        title="Create Stream"
        subtitle="Schedule a new live stream"
        colors={[BrandColors.teal, BrandColors.tealDark]}
        onBack={() => router.back()}
      />
      <TrainingStreamForm
        onSubmit={handleSubmit}
        loading={mutation.isPending}
        submitLabel="Schedule Stream"
      />
    </ScreenLayout>
  );
}
