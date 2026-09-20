import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { BrandColors, Glass } from '@/core/theme';
import { GlassBlob } from '@/shared/components';

import type { createUseLogin, createUseRegister } from '../hooks/useAuthFlow';
import { AuthHeader } from '../components/MemberAuth/AuthHeader';
import { AuthTabs } from '../components/MemberAuth/AuthTabs';
import { SignInForm } from '../components/MemberAuth/SignInForm';
import { SignUpForm } from '../components/MemberAuth/SignUpForm';
import { AdminLoginLink } from '../components/MemberAuth/AdminLoginLink';

interface MemberAuthScreenProps {
  useLogin: ReturnType<typeof createUseLogin>;
  useRegister: ReturnType<typeof createUseRegister>;
}

export function MemberAuthScreen({ useLogin, useRegister }: MemberAuthScreenProps) {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const { login, isLoading: isLoginLoading, errorMessage: loginError } = useLogin('member');
  const { register, isLoading: isRegisterLoading, errorMessage: registerError } = useRegister();

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <View style={styles.background}>
        <LinearGradient
          colors={[BrandColors.teal, '#0F3A30', '#0c2721']}
          style={StyleSheet.absoluteFill as any}
        />
        <GlassBlob color={BrandColors.memberGold} size={260} opacity={0.5} top={210} left={-90} />
        <GlassBlob color="#fff" size={220} opacity={0.16} top={undefined} bottom={120} right={-80} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}>
        
        <AuthHeader />

        <View style={styles.sheet}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <AuthTabs activeTab={activeTab} onTabChange={setActiveTab} />

            {activeTab === 'signin' ? (
              <SignInForm 
                isLoading={isLoginLoading} 
                errorMessage={loginError} 
                onLogin={(values) => login({ username: values.username, password: values.password })} 
                onSwitchToSignup={() => setActiveTab('signup')} 
              />
            ) : (
              <SignUpForm 
                isLoading={isRegisterLoading}
                errorMessage={registerError}
                onRegister={register}
                onSwitchToSignin={() => setActiveTab('signin')} 
              />
            )}

            <AdminLoginLink />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

export function createMemberAuthScreen(useLogin: ReturnType<typeof createUseLogin>, useRegister: ReturnType<typeof createUseRegister>) {
  return function MemberAuthScreenContainer() {
    return <MemberAuthScreen useLogin={useLogin} useRegister={useRegister} />;
  };
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFill,
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  sheet: {
    flex: 1,
    backgroundColor: 'rgba(242,244,247,0.86)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.6)',
    borderBottomWidth: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingTop: 26,
    marginTop: -26,
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 8,
  },
});
