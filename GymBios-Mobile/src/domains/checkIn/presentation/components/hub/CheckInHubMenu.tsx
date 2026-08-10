import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { CheckInHubCard } from './CheckInHubCard';

export function CheckInHubMenu() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <CheckInHubCard
        title="Members & Staff"
        description="Search members and perform manual check-ins."
        iconName="users"
        onPress={() => router.push('/(admin)/check-in/members-staff')}
      />
      <CheckInHubCard
        title="Walk-In / Daily Visitor"
        description="Register visitors and grant temporary access."
        iconName="user-plus"
        onPress={() => router.push('/(admin)/check-in/walk-in')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
});
