import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { CheckInHubCard } from './CheckInHubCard';

export function CheckInHubMenu() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <CheckInHubCard
        title={t('checkIn.hub.cards.membersStaffTitle')}
        description={t('checkIn.hub.cards.membersStaffSub')}
        iconName="users"
        onPress={() => router.push('/(admin)/check-in/members-staff')}
      />
      <CheckInHubCard
        title={t('checkIn.hub.cards.walkInTitle')}
        description={t('checkIn.hub.cards.walkInSub')}
        iconName="user-plus"
        onPress={() => router.push('/(admin)/check-in/walk-in')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
});
