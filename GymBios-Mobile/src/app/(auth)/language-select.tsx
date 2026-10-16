import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { LanguageSelectScreen } from '@/domains/profile';

/**
 * First-run language step. AuthBootstrap sends every signed-in user here until a
 * language has been confirmed on this device; `next` is where they were headed.
 */
export default function LanguageSelectRoute() {
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const nextHref = next || '/';

  return (
    <>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <LanguageSelectScreen
        mode="onboarding"
        resumeHref={nextHref}
        onDone={() => router.replace(nextHref as Href)}
      />
    </>
  );
}
