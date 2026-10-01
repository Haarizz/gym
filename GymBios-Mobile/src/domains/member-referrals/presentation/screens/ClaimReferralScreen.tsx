import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';

import { Typography } from '@/shared/components/Typography';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { AppHeader } from '@/shared/components/AppHeader';
import { useClaimReferral } from '../hooks/useMemberReferrals';
import { Spacing } from '@/core/theme';
import Feather from '@expo/vector-icons/Feather';

export const ClaimReferralScreen = () => {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);
  
  const { mutate: claimReferral, isPending } = useClaimReferral();




  const handleClaim = () => {
    if (!code) {
      setMessage({ text: 'Please enter a code', type: 'error' });
      return;
    }
    
    claimReferral(code, {
      onSuccess: () => {
        setMessage({ text: 'Referral claimed successfully!', type: 'success' });

        // Deliberately NOT calling setActiveTenant(res.tenantSlug): claiming a code
        // doesn't make the user a member of the referrer's gym, and pinning
        // X-Tenant-ID there makes the backend 403 every request as "not a member
        // of this Gym". The tenant is set once a purchase actually creates the
        // membership (see MemberCentersScreen.handleViewDetails).
        setTimeout(() => {
          // Route the user to the gym discovery screen
          router.replace('/(member)/centers');
        }, 1500);
      },
      onError: (err: any) => {
        // apiClient rejects with ApiError (body = the parsed response), not an axios error —
        // the claim endpoint reports its reason as { error: "..." }.
        setMessage({ text: err?.body?.error || err?.body?.message || 'Failed to claim referral', type: 'error' });
      }
    });
  };

  const handleSkip = () => {
    router.replace('/(member)');
  };

  return (
    <ScreenLayout>
      <AppHeader 
        title="Welcome" 
        colors={['#327f74', '#2a6b62']} 
      />
      <View style={styles.content}>
        <View style={styles.headerIcon}>
          <Feather name="gift" size={48} color="#2a6b62" />
        </View>
        <Typography variant="title" style={styles.title}>Did someone refer you?</Typography>
        <Typography variant="body" color="textSecondary" style={styles.subtitle}>
          Enter their referral code below to make sure they get their reward when you buy a membership.
        </Typography>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            placeholder="Enter 8-character code"
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {message && (
          <Typography 
            variant="bodySmall" 
            style={{ color: message.type === 'error' ? '#d4183d' : '#2a6b62', marginBottom: Spacing.md, textAlign: 'center' }}
          >
            {message.text}
          </Typography>
        )}

        <TouchableOpacity 
          style={[styles.claimButton, isPending && { opacity: 0.7 }]} 
          onPress={handleClaim}
          disabled={isPending}
        >
          <Typography variant="body" style={{ color: '#fff', fontWeight: 'bold' }}>
            {isPending ? 'Claiming...' : 'Claim Code'}
          </Typography>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Typography variant="body" color="textSecondary">I don't have a code</Typography>
        </TouchableOpacity>
      </View>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: Spacing.four,
    justifyContent: 'center',
  },
  headerIcon: {
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: Spacing.four,
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 8,
    marginBottom: Spacing.md,
  },
  input: {
    padding: Spacing.md,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 1,
  },
  claimButton: {
    backgroundColor: '#2a6b62',
    padding: Spacing.md,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  skipButton: {
    padding: Spacing.md,
    alignItems: 'center',
  },
});
