import { useRouter } from 'expo-router';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';

import { AppHeader } from '@/shared/components/AppHeader';
import { BrandColors } from '@/core/theme';
import { TrainingStreamForm } from '../components/TrainingStreamForm';

import { useCreateTrainingStream } from '../../hooks/useTrainingStreamActions';
import type { CreateTrainingStreamRequest } from '../../application/TrainingStreamRepository';
import { toast } from '@/shared/components/Toasts/toastStore';

export function CreateTrainingStreamScreen() {
  const router = useRouter();
  const mutation = useCreateTrainingStream();

  const handleSubmit = async (values: CreateTrainingStreamRequest) => {
    try {
      await mutation.mutateAsync(values);
      router.back();
    } catch (e: any) {
      toast.error(e.message || 'Failed to create stream', {
        title: 'Error'
      });
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
