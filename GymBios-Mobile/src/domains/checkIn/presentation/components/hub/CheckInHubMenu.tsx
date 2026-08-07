import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { CheckInHubCard } from './CheckInHubCard';

export function CheckInHubMenu() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <CheckInHubCard
        title="Members & Staff"
        description="Search members and perform manual check-ins."
        iconName="users"
        onPress={() => navigation.navigate('MembersStaffCheckIn')}
      />
      <CheckInHubCard
        title="Walk-In / Daily Visitor"
        description="Register visitors and grant temporary access."
        iconName="user-plus"
        onPress={() => navigation.navigate('WalkInCheckIn')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
});
