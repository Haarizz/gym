import { useRouter } from 'expo-router';
import { PromotionsScreen } from '@/domains/promotions/presentation/screens/PromotionsScreen';
import type { PromotionCampaignResponse } from '@/domains/promotions/domain/PromotionCampaign';

export default function PromotionsIndexRoute() {
  const router = useRouter();

  return (
    <PromotionsScreen
      onNavigateToCreate={() => {
        router.push('/(admin)/promotions/create' as any);
      }}
      onNavigateToEdit={(promotion: PromotionCampaignResponse) => {
        router.push(`/(admin)/promotions/edit/${promotion.id}` as any);
      }}
    />
  );
}
