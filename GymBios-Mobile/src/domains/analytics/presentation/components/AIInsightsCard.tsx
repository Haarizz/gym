import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Radius, Spacing, BrandColors, TypographyScale } from '@/core/theme';

import { LinearGradient } from 'expo-linear-gradient';

interface AIInsightsCardProps {
  insights: string[];
}

export function AIInsightsCard({ insights }: AIInsightsCardProps) {
  if (!insights || insights.length === 0) return null;

  return (
    <LinearGradient colors={['#327f74', '#2a6b62']} style={styles.card}>
      <View style={styles.header}>
        <Feather name="activity" size={20} color="#FFF" />
        <Text style={styles.title}>AI Insights</Text>
      </View>
      <Text style={styles.text}>
        {insights.join(' ')}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  text: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
});
