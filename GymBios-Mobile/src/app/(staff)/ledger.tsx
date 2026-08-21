import { Redirect } from 'expo-router';
import { StaffLedgerScreen } from '@/domains/ledger';
import { View } from 'react-native';
import { useProfile } from '@/domains/profile';
import { Loader } from '@/shared/components';

export default function StaffLedgerRoute() {
  const { profile, isLoading } = useProfile();

  if (isLoading || !profile) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' }}>
        <Loader message="Loading..." />
      </View>
    );
  }

  if (profile.role === 'TRAINER') {
    return <Redirect href="/(trainer)/ledger" />;
  }

  return <StaffLedgerScreen />;
}
