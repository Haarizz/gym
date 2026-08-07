import { EmptyState as SharedEmptyState } from '@/shared/components/EmptyState';
import Feather from '@expo/vector-icons/Feather';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: keyof typeof Feather.glyphMap;
}

export function EmptyState({ title, description, icon = 'inbox' }: EmptyStateProps) {
  return <SharedEmptyState title={title} description={description} icon={icon} />;
}
