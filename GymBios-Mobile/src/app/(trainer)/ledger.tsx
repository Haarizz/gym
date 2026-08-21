import { Redirect } from 'expo-router';
import { TrainerLedgerScreen } from '@/domains/ledger';
import { View } from 'react-native';
import { useProfile } from '@/domains/profile';
import { Loader } from '@/shared/components';

export default function TrainerLedgerRoute() {
  const { profile, isLoading } = useProfile();

  if (isLoading || !profile) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' }}>
        <Loader message="Loading..." />
      </View>
    );
  }

  if (profile.role === 'STAFF') {
    return <Redirect href="/(staff)/ledger" />;
  }

  return <TrainerLedgerScreen />;
}
