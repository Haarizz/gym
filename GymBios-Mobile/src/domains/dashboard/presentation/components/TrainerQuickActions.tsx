import { useRouter } from 'expo-router';
import { BrandColors } from '@/core/theme';
import { QuickActionsGrid, type QuickAction } from './QuickActionsGrid';

interface TrainerQuickActionsProps {
  onMessageMember?: () => void;
  onCreateWorkout?: () => void;
  onTrackProgress?: () => void;
  onViewLedger?: () => void;
}

export function TrainerQuickActions({
  onMessageMember,
  onCreateWorkout,
  onTrackProgress,
  onViewLedger,
}: TrainerQuickActionsProps) {
  const router = useRouter();

  const handleMessage = () => {
    if (onMessageMember) onMessageMember();
    else router.push('/(trainer)/messaging' as any);
  };

  const handleCreateWorkout = () => {
    if (onCreateWorkout) onCreateWorkout();
    else router.push('/(trainer)/workout-feedback' as any);
  };

  const handleTrackProgress = () => {
    if (onTrackProgress) onTrackProgress();
    else router.push('/(trainer)/performance' as any);
  };

  const handleViewLedger = () => {
    if (onViewLedger) onViewLedger();
    else router.push('/(trainer)/ledger' as any);
  };

  const actions: QuickAction[] = [
    { label: 'Message Member', icon: 'message-circle', color: BrandColors.trainerAmber, textColor: '#b45309', onPress: handleMessage },
    { label: 'Create Workout', icon: 'activity', color: BrandColors.teal, textColor: '#1B5A4C', onPress: handleCreateWorkout },
    { label: 'Track Progress', icon: 'trending-up', color: BrandColors.memberGold, textColor: '#9A6212', onPress: handleTrackProgress },
    { label: 'View Ledger', icon: 'book-open', color: '#A855F7', textColor: '#7E22CE', onPress: handleViewLedger },
  ];

  return <QuickActionsGrid actions={actions} />;
}
