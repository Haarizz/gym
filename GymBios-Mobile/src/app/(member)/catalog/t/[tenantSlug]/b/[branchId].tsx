import { useLocalSearchParams } from 'expo-router';
import { MemberCentersScreen } from '@/domains/memberPortal/centers';

export default function CatalogDeepLinkRoute() {
  const params = useLocalSearchParams<{ tenantSlug: string, branchId: string }>();

  // Use the existing Centers Screen but inject the deep link props.
  // This route acts purely as a thin adapter as per the architectural rules.
  return <MemberCentersScreen initialDeepLink={params} />;
}
