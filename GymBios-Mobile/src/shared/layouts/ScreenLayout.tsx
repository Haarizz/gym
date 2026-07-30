import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/core/theme';
import { Surface } from '@/shared/components/Surface';

interface ScreenLayoutProps {
  children: React.ReactNode;
  scrollable?: boolean;
}

// Keep these in sync with the floating tab bar defined in RoleTabsLayout,
// so scrollable content is never hidden behind it.
const TAB_BAR_HEIGHT = 74;
const TAB_BAR_BOTTOM_OFFSET = 20;
const TAB_BAR_BREATHING_ROOM = 24;

export function ScreenLayout({ children, scrollable = false }: ScreenLayoutProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const bottomPadding =
    TAB_BAR_HEIGHT +
    TAB_BAR_BOTTOM_OFFSET +
    Spacing.one +
    insets.bottom;

  const content = scrollable ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    children
  );
  
  const shouldCapWidth = Platform.OS !== 'web' || width >= 900;

  return (
    <Surface background="backgroundElement" style={styles.container}>
      <SafeAreaView
        style={[
          styles.safeArea,
          shouldCapWidth && styles.contentCapped,
        ]}>
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
    width: '100%',
  },
  contentCapped: {
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});