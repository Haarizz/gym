import React from 'react';
import { StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { MoneyText } from './MoneyText';

interface OutstandingBalanceCardProps {
  balance: number | undefined;
  label?: string;
}

/**
 * Prominent card showing a member's outstanding balance.
 * Changes colour to red when the balance is positive (money owed).
 */
export function OutstandingBalanceCard({
  balance = 0,
  label = 'Outstanding Balance',
}: OutstandingBalanceCardProps) {
  const isOwed = (balance ?? 0) > 0;

  return (
    <View style={[styles.card, isOwed && styles.cardAlert]}>
      <View style={[styles.iconBox, isOwed ? styles.iconBoxAlert : styles.iconBoxGood]}>
        <Feather
          name={isOwed ? 'alert-circle' : 'check-circle'}
          size={22}
          color="#ffffff"
        />
      </View>
      <View style={styles.text}>
        <Typography variant="caption" color="textSecondary">
          {label}
        </Typography>
        <MoneyText
          amount={Math.abs(balance ?? 0)}
          variant="subtitle"
          color={isOwed ? '#b91c1c' : '#15803d'}
        />
      </View>
      {isOwed && (
        <View style={styles.owedChip}>
          <Typography variant="caption" style={styles.owedText}>
            Amount Due
          </Typography>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    backgroundColor: '#f0fdf4',
    borderRadius: Radius.lg,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  cardAlert: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxGood: {
    backgroundColor: '#16a34a',
  },
  iconBoxAlert: {
    backgroundColor: '#b91c1c',
  },
  text: {
    flex: 1,
    gap: 2,
  },
  owedChip: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  owedText: {
    color: '#b91c1c',
    fontWeight: '600',
    fontSize: 10,
  },
});
