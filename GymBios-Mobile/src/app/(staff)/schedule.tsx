import { Redirect } from 'expo-router';
import { StaffScheduleScreen } from '@/domains/schedule';
import { View } from 'react-native';
import { useProfile } from '@/domains/profile';
import { Loader } from '@/shared/components';

export default function StaffScheduleRoute() {
  const { profile, isLoading } = useProfile();

  if (isLoading || !profile) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' }}>
        <Loader message="Loading..." />
      </View>
    );
  }

  if (profile.role === 'TRAINER') {
    return <Redirect href="/(trainer)/schedule" />;
  }

  return <StaffScheduleScreen />;
}
