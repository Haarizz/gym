import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <EmptyState
        icon="calendar"
        title={t('community.events.title')}
        description={t('community.events.description')}
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
