import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { EmptyState } from '@/shared/components';

/**
 * Events destination — polished unavailable state.
 *
 * The current Community backend does NOT expose an Events API.
 * No fake event data, mock events, or fabricated event service.
 * When a real Events domain is introduced, this screen will be replaced.
 */
export function CommunityEventsScreen() {
  return (
    <View style={styles.container}>
      <EmptyState
        icon="calendar"
        title="Community Events Coming Soon"
        description={
          'Community events will appear here when your gym\'s events feature is available.\n\nCheck back later or ask your gym admin about upcoming events.'
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
  },
});
