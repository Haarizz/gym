import { useRouter } from 'expo-router';
import { BrandColors } from '@/core/theme';
import { QuickActionsGrid, type QuickAction } from './QuickActionsGrid';

interface StaffQuickActionsProps {
  onAddLead?: () => void;
  onCheckIn?: () => void;
}

export function StaffQuickActions({ onAddLead, onCheckIn }: StaffQuickActionsProps) {
  const router = useRouter();

  const handleAddLead = () => {
    if (onAddLead) {
      onAddLead();
    } else {
      router.push('/(staff)/leads/add' as any);
    }
  };

  const handleCheckIn = () => {
    if (onCheckIn) {
      onCheckIn();
    } else {
      router.push('/(staff)/check-in' as any);
    }
  };

  const actions: QuickAction[] = [
    { label: 'Add New Lead', icon: 'user-plus', color: BrandColors.trainerAmber, textColor: '#b45309', onPress: handleAddLead },
    { label: 'Member Check-in', icon: 'check-circle', color: BrandColors.teal, textColor: '#1B5A4C', onPress: handleCheckIn },
  ];

  return <QuickActionsGrid actions={actions} />;
}
