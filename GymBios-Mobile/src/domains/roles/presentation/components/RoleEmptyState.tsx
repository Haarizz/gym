import { StyleSheet, View } from 'react-native';
import { EmptyState } from '@/shared/components/EmptyState';
import { Spacing } from '@/core/theme';

interface RoleEmptyStateProps {
  searchQuery?: string;
  onClearSearch?: () => void;
  onCreateRole?: () => void;
}

export function RoleEmptyState({ searchQuery, onClearSearch, onCreateRole }: RoleEmptyStateProps) {
  if (searchQuery) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="search"
          title="No roles found"
          description={`We couldn't find any roles matching "${searchQuery}".`}
          buttonLabel="Clear Search"
          onPress={onClearSearch}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <EmptyState
        icon="shield"
        title="No Roles Yet"
        description="Create your first role to start managing permissions."
        buttonLabel="Create Role"
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
