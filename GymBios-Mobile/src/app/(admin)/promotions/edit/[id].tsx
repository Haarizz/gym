import { useLocalSearchParams, useRouter } from 'expo-router';
import { PromotionFormScreen } from '@/domains/promotions/presentation/screens/PromotionFormScreen';

export default function EditPromotionRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const promotionId = id ? Number(id) : undefined;

  return (
    <PromotionFormScreen
      mode="edit"
      promotionId={promotionId}
      onSuccess={() => {
        router.back();
      }}
      onCancel={() => {
        router.back();
      }}
    />
  );
}
