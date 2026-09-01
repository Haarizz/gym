import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';

import { Typography } from './Typography';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  /** 'default' uses the standard themed style; 'auth' uses a white card-style input for login screens */
  variant?: 'default' | 'auth';
  containerStyle?: any;
  leftIcon?: React.ReactNode;
}

export function Input({
  label,
  error,
  style,
  variant = 'default',
  onFocus,
  onBlur,
  containerStyle,
  leftIcon,
  ...rest
}: InputProps) {
  const theme = useTheme();

  const [focused, setFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const isAuth = variant === 'auth';
  const isPasswordField = !!rest.secureTextEntry;

  const inputStyle = isAuth
    ? [
        styles.authInput,
        focused && !error && styles.authInputFocused,
        error && styles.authInputError,
        style,
      ]
    : [
        styles.input,
        {
          color: theme.text,
          backgroundColor: theme.backgroundElement,
          borderColor: error ? theme.error : theme.border,
        },
        style,
      ];

  return (
    <View style={containerStyle}>
      {label ? (
        <Typography
          variant="bodySmallBold"
          style={[styles.label, isAuth && styles.authLabel]}
        >
          {label}
        </Typography>
      ) : null}

      <View style={styles.inputContainer}>
        {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}
        <TextInput
          {...rest}
          secureTextEntry={
            isPasswordField ? !passwordVisible : rest.secureTextEntry
          }
          placeholderTextColor={
            isAuth ? '#94a3b8' : theme.textSecondary
          }
          style={[
            isAuth ? { color: '#1e293b' } : { color: theme.text },
            inputStyle,
          ]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
        />

        {isPasswordField && (
          <Pressable
            style={styles.togglePassword}
            hitSlop={8}
            onPress={() =>
              setPasswordVisible((prev) => !prev)
            }
          >
            <Feather
              name={passwordVisible ? 'eye' : 'eye-off'}
              size={20}
              color="#64748b"
            />
          </Pressable>
        )}
      </View>

      {error ? (
        <Typography
          variant="caption"
          color="error"
          style={styles.error}
        >
          {error}
        </Typography>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: Spacing.one,
  },

  authLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },

  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },

  leftIconContainer: {
    position: 'absolute',
    left: Spacing.three,
    zIndex: 1,
  },

  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },

  authInput: {
    height: 56,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingLeft: 16,
    paddingRight: 52,
    fontSize: 16,
    color: '#1e293b',

    // iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,

    // Android
    elevation: 2,
  },

  authInputFocused: {
    borderColor: BrandColors.teal,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },

  authInputError: {
    borderColor: '#d4183d',
  },

  togglePassword: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
  },

  error: {
    marginTop: Spacing.one,
  },
});