import { useRouter } from 'expo-router';
import { PromotionFormScreen } from '@/domains/promotions/presentation/screens/PromotionFormScreen';

export default function CreatePromotionRoute() {
  const router = useRouter();

  return (
    <PromotionFormScreen
      mode="create"
      onSuccess={() => {
        router.back();
      }}
      onCancel={() => {
        router.back();
      }}
    />
  );
}
