import { Stack } from 'expo-router';

/**
 * Billing module stack navigator.
 * All screens share the same headerShown: false so that each screen
 * renders its own AppHeader (consistent with the rest of the app).
 */
export default function BillingStack() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="create-receipt/index" />
      <Stack.Screen name="receipts/index" />
      <Stack.Screen name="receipts/[id]" />
      <Stack.Screen name="dues/index" />
      <Stack.Screen name="statements/index" />
      <Stack.Screen name="reports/index" />
      <Stack.Screen name="members/[id]/statement" />
      <Stack.Screen name="members/[id]/pending-bills" />
      <Stack.Screen name="members/[id]/pay" />
    </Stack>
  );
}
