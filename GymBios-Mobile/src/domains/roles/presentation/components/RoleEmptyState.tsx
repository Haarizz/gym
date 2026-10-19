import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/shared/components/EmptyState';
import { Spacing } from '@/core/theme';

interface RoleEmptyStateProps {
  searchQuery?: string;
  onClearSearch?: () => void;
  onCreateRole?: () => void;
}

export function RoleEmptyState({ searchQuery, onClearSearch, onCreateRole }: RoleEmptyStateProps) {
  const { t } = useTranslation();

  if (searchQuery) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="search"
          title={t('roles.noRolesFoundTitle')}
          description={t('roles.noRolesFoundDesc', { query: searchQuery })}
          buttonLabel={t('roles.clearSearch')}
          onPress={onClearSearch}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <EmptyState
        icon="shield"
        title={t('roles.noRolesYetTitle')}
        description={t('roles.noRolesYetDesc')}
        buttonLabel={t('roles.createRole')}
        onPress={onCreateRole}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.four,
    marginTop: Spacing.four,
  },
});
