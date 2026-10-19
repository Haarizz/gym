import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { BrandColors } from '@/core/theme';
import { QuickActionsGrid, type QuickAction } from './QuickActionsGrid';

interface AdminQuickActionsCardProps {
  onCreateOffer?: () => void;
  onAddStaff?: () => void;
  onViewReports?: () => void;
  onManageBranch?: () => void;
}

export function AdminQuickActionsCard({
  onCreateOffer,
  onAddStaff,
  onViewReports,
  onManageBranch,
}: AdminQuickActionsCardProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const handleCreateOffer = () => {
    if (onCreateOffer) onCreateOffer();
    else router.push('/(admin)/promotions' as any);
  };

  const handleAddStaff = () => {
    if (onAddStaff) onAddStaff();
    else router.push('/(admin)/staff' as any);
  };

  const handleViewReports = () => {
    if (onViewReports) onViewReports();
    else router.push('/(admin)/analytics' as any);
  };

  const handleManageBranch = () => {
    if (onManageBranch) onManageBranch();
    else router.push('/(admin)/facilities' as any);
  };

  const actions: QuickAction[] = [
    { label: t('dashboard.admin.quickActions.createOffer'), icon: 'tag', color: BrandColors.memberGold, textColor: '#9A6212', onPress: handleCreateOffer },
    { label: t('dashboard.admin.quickActions.addStaff'), icon: 'user-plus', color: BrandColors.teal, textColor: '#1B5A4C', onPress: handleAddStaff },
    { label: t('dashboard.admin.quickActions.viewReports'), icon: 'bar-chart-2', color: '#8B5CF6', textColor: '#6D28D9', onPress: handleViewReports },
    { label: t('dashboard.admin.quickActions.manageBranch'), icon: 'home', color: '#F59E0B', textColor: '#b45309', onPress: handleManageBranch },
  ];

  return <QuickActionsGrid actions={actions} />;
}
