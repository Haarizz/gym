import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { BrandColors } from '@/core/theme';
import { QuickActionsGrid, type QuickAction } from './QuickActionsGrid';

interface StaffQuickActionsProps {
  onAddLead?: () => void;
  onCheckIn?: () => void;
}

export function StaffQuickActions({ onAddLead, onCheckIn }: StaffQuickActionsProps) {
  const { t } = useTranslation();
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
    { label: t('dashboard.staff.quickActions.addNewLead'), icon: 'user-plus', color: BrandColors.trainerAmber, textColor: '#b45309', onPress: handleAddLead },
    { label: t('dashboard.staff.quickActions.memberCheckIn'), icon: 'check-circle', color: BrandColors.teal, textColor: '#1B5A4C', onPress: handleCheckIn },
  ];

  return <QuickActionsGrid actions={actions} />;
}
