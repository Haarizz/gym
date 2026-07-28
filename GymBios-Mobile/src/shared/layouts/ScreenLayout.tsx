import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/core/theme';
import { Surface } from '@/shared/components/Surface';

interface ScreenLayoutProps {
  children: React.ReactNode;
  scrollable?: boolean;
}

export function ScreenLayout({ children, scrollable = false }: ScreenLayoutProps) {
  const content = scrollable ? (
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    children
  );

  return (
    <Surface background="backgroundElement" style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboard}>
          {content}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.four,
  },
});
