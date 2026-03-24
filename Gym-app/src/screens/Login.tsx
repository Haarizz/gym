import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { GlassCard } from '../components/GlassCard';
import { GlassScreen } from '../components/GlassScreen';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { BRAND_COLOR } from '../theme';

export function Login() {
  const { colors, settings } = useSettings();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError('Please enter your username and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (e: any) {
      setError(e.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassScreen>
      <StatusBar style={settings.darkMode ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.center}>
          <View style={styles.container}>

            {/* Brand */}
            <View style={styles.brandRow}>
              <View style={[styles.logoWrap, { backgroundColor: BRAND_COLOR }]}>
                <MaterialCommunityIcons name="dumbbell" size={26} color="#fff" />
              </View>
              <Text style={[styles.brandName, { color: BRAND_COLOR }]}>GymBios</Text>
            </View>

            {/* Hero banner */}
            <GlassCard style={styles.heroShell} intensity={35}>
              <LinearGradient
                colors={['#0F9F67', '#38C7A4', '#7DD3FC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hero}
              >
                <View style={styles.heroGlow} />
                <Text style={styles.heroTitle}>Welcome Back</Text>
                <Text style={styles.heroSubtitle}>Sign in to your GymBios account</Text>
              </LinearGradient>
            </GlassCard>

            {/* Form */}
            <GlassCard style={styles.formCard}>
              <View style={styles.formInner}>
                <Text style={[styles.formTitle, { color: colors.text }]}>Sign In</Text>

                {!!error && (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={16} color="#EF4444" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <Text style={[styles.label, { color: colors.textMuted }]}>Username</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.input, borderColor: colors.border }]}>
                  <Ionicons name="person-outline" size={18} color={colors.textMuted} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Enter your username"
                    placeholderTextColor={colors.textMuted}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>

                <Text style={[styles.label, { color: colors.textMuted }]}>Password</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.input, borderColor: colors.border }]}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Enter your password"
                    placeholderTextColor={colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeButton}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.loginButtonText}>Sign In</Text>
                  )}
                </TouchableOpacity>
              </View>
            </GlassCard>

            <Text style={[styles.hint, { color: colors.textMuted }]}>
              Contact your gym admin to get your login credentials.
            </Text>

          </View>
        </View>
      </KeyboardAvoidingView>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  container: {
    width: '100%',
    maxWidth: 420,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    justifyContent: 'center',
  },
  logoWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  heroShell: {
    marginBottom: 16,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  hero: {
    borderRadius: 20,
    padding: 18,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.16)',
    top: -40,
    right: -10,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.84)',
    marginTop: 4,
  },
  formCard: {
    borderRadius: 24,
    marginBottom: 16,
  },
  formInner: {
    padding: 18,
  },
  formTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  eyeButton: {
    padding: 2,
  },
  loginButton: {
    backgroundColor: BRAND_COLOR,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 18,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  hint: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
  },
});
