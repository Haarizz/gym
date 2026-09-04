import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

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
          colors={['#DCEAE2', '#EEF3F0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill as any}
        />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          
          <AuthHeader />

          <View style={styles.sheet}>
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
          </View>
        </ScrollView>
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
    ...StyleSheet.absoluteFill as any,
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  sheet: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 24,
    paddingTop: 26,
    marginTop: -26,
    zIndex: 2,
    shadowColor: '#0a3f34',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 8,
  },
});
