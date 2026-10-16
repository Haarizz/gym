import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { useTranslation } from 'react-i18next';

import { BrandColors, Spacing } from '@/core/theme';
import { GlassBlob, Typography } from '@/shared/components';

import { getRoleLoginConfig } from '../config/roleConfig';
import { LoginForm } from '../forms/LoginForm';
import type { createUseLogin } from '../hooks/useAuthFlow';
import { ROLE_SELECTION_HREF } from '../navigation/routes';
import type { AppRole } from '../../domain/valueObjects/AppRole';
import { isAppRole } from '../../domain/valueObjects/AppRole';
import { useAuthStore } from '../../store/authStore';

interface RoleLoginScreenProps {
  role: AppRole;
  useLogin: ReturnType<typeof createUseLogin>;
}

export function RoleLoginScreen({ role, useLogin }: RoleLoginScreenProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const config = getRoleLoginConfig(role, t);
  const { login, isLoading } = useLogin(role);

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <LinearGradient
        colors={[BrandColors.screenBackground, BrandColors.screenBackgroundAlt]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <GlassBlob color={config.accentColor} size={280} opacity={0.3} top={-90} start={-70} />
      <GlassBlob color={BrandColors.teal} size={240} opacity={0.22} bottom={40} end={-80} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>

          {/* Back button — sits above the scroll area */}
          <View style={styles.topBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('auth.roleSelection.backA11y')}
              onPress={() => router.replace(ROLE_SELECTION_HREF)}
              style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}>
              <Feather
                name={I18nManager.isRTL ? 'chevron-right' : 'chevron-left'}
                size={22}
                color={BrandColors.textPrimary}
              />
              <Typography variant="bodySmall" style={styles.backText}>
                {t('shared.goBack')}
              </Typography>
            </Pressable>
          </View>

          {/* Scrollable area — card is vertically centered */}
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <LoginForm
              config={config}
              onSubmit={login}
              loading={isLoading}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

export function createRoleLoginScreen(useLogin: ReturnType<typeof createUseLogin>) {
  return function RoleLoginScreenContainer() {
    const router = useRouter();
    const pendingRole = useAuthStore((state) => state.pendingRole);

    useEffect(() => {
      if (!pendingRole || !isAppRole(pendingRole)) {
        router.replace(ROLE_SELECTION_HREF);
      }
    }, [pendingRole, router]);

    if (!pendingRole || !isAppRole(pendingRole)) {
      return null;
    }

    return <RoleLoginScreen role={pendingRole} useLogin={useLogin} />;
  };
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingEnd: 12,
    borderRadius: 8,
  },
  backButtonPressed: {
    opacity: 0.6,
  },
  backText: {
    color: BrandColors.textPrimary,
    fontWeight: '600',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
  },
});
