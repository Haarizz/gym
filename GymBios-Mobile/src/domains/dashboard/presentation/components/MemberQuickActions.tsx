import { useRouter } from 'expo-router';
import { BrandColors } from '@/core/theme';
import { QuickActionsGrid, type QuickAction } from './QuickActionsGrid';

export function MemberQuickActions() {
  const router = useRouter();

  const actions: QuickAction[] = [
    {
      label: 'Book a Class',
      icon: 'calendar',
      color: BrandColors.memberGold,
      textColor: '#9A6212',        // dark amber — legible on glass
      onPress: () => router.push('/(member)/bookings' as any),
    },
    {
      label: 'My Trainer',
      icon: 'user',
      color: BrandColors.teal,
      textColor: '#1B5A4C',        // deep teal
      onPress: () => router.push('/(member)/trainer' as any),
    },
    {
      label: 'Subscription',
      icon: 'credit-card',
      color: '#F59E0B',
      textColor: '#b45309',        // warm amber
      onPress: () => router.push('/(member)/membership' as any),
    },
    {
      label: 'Find Centers',
      icon: 'map-pin',
      color: '#8B5CF6',
      textColor: '#6D28D9',        // violet
      onPress: () => router.push('/(member)/centers' as any),
    },
  ];

  return <QuickActionsGrid actions={actions} />;
}
