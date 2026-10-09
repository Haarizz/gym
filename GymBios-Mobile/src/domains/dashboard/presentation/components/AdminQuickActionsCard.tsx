import { useRouter } from 'expo-router';
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
    { label: 'Create Offer', icon: 'tag', color: BrandColors.memberGold, textColor: '#9A6212', onPress: handleCreateOffer },
    { label: 'Add Staff', icon: 'user-plus', color: BrandColors.teal, textColor: '#1B5A4C', onPress: handleAddStaff },
    { label: 'View Reports', icon: 'bar-chart-2', color: '#8B5CF6', textColor: '#6D28D9', onPress: handleViewReports },
    { label: 'Manage Branch', icon: 'home', color: '#F59E0B', textColor: '#b45309', onPress: handleManageBranch },
  ];

  return <QuickActionsGrid actions={actions} />;
}
