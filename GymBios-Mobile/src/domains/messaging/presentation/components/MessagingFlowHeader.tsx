import React from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { MessagingColors } from '../theme';

interface MessagingFlowHeaderProps {
  title: string;
  subtitle: string;
  step?: 1 | 2;
  onBack?: () => void;
  showStepper?: boolean;
}

export function MessagingFlowHeader({
  title,
  subtitle,
  step,
  onBack,
  showStepper = true,
}: MessagingFlowHeaderProps) {
  return (
    <LinearGradient
      colors={[MessagingColors.accent, MessagingColors.accent2]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.topRow}>
        <Pressable style={styles.backBtn} onPress={onBack} hitSlop={8}>
          <Feather name="chevron-left" size={20} color="#ffffff" />
        </Pressable>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>
      
      {showStepper && (
        <>
          <View style={styles.stepperContainer}>
            <View style={[styles.stepTrack, step === 1 || step === 2 ? styles.stepActive : undefined]}>
              <View style={[styles.stepFill, step === 1 || step === 2 ? styles.stepFillActive : undefined]} />
            </View>
            <View style={[styles.stepTrack, step === 2 ? styles.stepActive : undefined]}>
              <View style={[styles.stepFill, step === 2 ? styles.stepFillActive : undefined]} />
            </View>
          </View>
          <View style={styles.stepLabels}>
            <Text style={styles.stepLabel}>1 · Recipients</Text>
            <Text style={styles.stepLabel}>2 · Message</Text>
          </View>
        </>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
    zIndex: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 17,
    lineHeight: 20,
  },
  subtitle: {
    color: '#ffffff',
    fontSize: 11.5,
    opacity: 0.85,
    fontWeight: '500',
    marginTop: 1,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 14,
  },
  stepTrack: {
    flex: 1,
    height: 5,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.28)',
    overflow: 'hidden',
  },
  stepActive: {
    // For container styles if needed
  },
  stepFill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#ffffff',
    borderRadius: 4,
    width: '0%', // Start empty
  },
  stepFillActive: {
    width: '100%',
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 7,
  },
  stepLabel: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.3,
    opacity: 0.9,
  },
});
