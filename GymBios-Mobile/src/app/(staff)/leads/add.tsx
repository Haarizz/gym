import { AddLeadScreen } from '@/domains/leads/presentation/screens/AddLeadScreen';
import { Stack } from 'expo-router';

export default function AddLeadRoute() {
  return (
    <>
      <Stack.Screen options={{ animation: 'none', presentation: 'transparentModal', headerShown: false }} />
      <AddLeadScreen />
    </>
  );
}
