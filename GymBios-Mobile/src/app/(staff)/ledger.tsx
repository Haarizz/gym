import { Redirect, useLocalSearchParams } from 'expo-router';
import { StaffLedgerScreen } from '@/domains/ledger';
import { View } from 'react-native';
import { useProfile } from '@/domains/profile';
import { Loader } from '@/shared/components';

export default function StaffLedgerRoute() {
  const { profile, isLoading } = useProfile();
  const { tab } = useLocalSearchParams<{ tab?: string }>();

  if (isLoading || !profile) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' }}>
        <Loader />
      </View>
    );
  }

  if (profile.role === 'TRAINER') {
    return <Redirect href={tab === 'advances' ? '/(trainer)/ledger?tab=advances' : '/(trainer)/ledger'} />;
  }

  return <StaffLedgerScreen />;
}
