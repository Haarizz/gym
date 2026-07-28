import {
  TRAINER_HEADER,
  TRAINER_TABS,
  RoleTabsLayout,
} from '@/domains/auth/presentation/navigation/RoleTabsLayout';

export default function TrainerLayout() {
  return (
    <RoleTabsLayout
      title={TRAINER_HEADER.title}
      subtitle={TRAINER_HEADER.subtitle}
      headerColors={TRAINER_HEADER.headerColors}
      activeColor={TRAINER_HEADER.activeColor}
      tabs={TRAINER_TABS}
    />
  );
}
