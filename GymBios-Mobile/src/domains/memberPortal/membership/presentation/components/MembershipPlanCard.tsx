import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import Feather from '@expo/vector-icons/Feather';

interface MembershipPlanCardProps {
  name: string;
  price: number;
  duration: string;
  isCurrent: boolean;
  isSelected: boolean;
  onSelect: () => void;
}

export function MembershipPlanCard({
  name,
  price,
  duration,
  isCurrent,
  isSelected,
  onSelect,
}: MembershipPlanCardProps) {
  return (
    <Pressable
      style={[
        styles.card,
        isSelected && styles.cardSelected,
      ]}
      onPress={onSelect}
    >
      <View style={styles.header}>
        <Text style={[styles.name, isSelected && styles.nameSelected]}>{name}</Text>
        {isCurrent && (
          <View style={styles.currentBadge}>
            <Text style={styles.currentText}>CURRENT</Text>
          </View>
        )}
      </View>
      <Text style={[styles.duration, isSelected && styles.durationSelected]}>
        {duration}
      </Text>
      <View style={styles.footer}>
        <Text style={[styles.price, isSelected && styles.priceSelected]}>
          ₹{price.toLocaleString()}
        </Text>
        <View style={[styles.radio, isSelected && styles.radioSelected]}>
          {isSelected && <View style={styles.radioInner} />}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.screenBackground,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: Spacing.three,
  },
  cardSelected: {
    backgroundColor: '#FFFBEB',
    borderColor: BrandColors.memberGold,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  nameSelected: {
    color: '#92400E',
  },
  currentBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  currentText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  duration: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    marginBottom: Spacing.three,
  },
  durationSelected: {
    color: '#B45309',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  priceSelected: {
    color: BrandColors.memberGold,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: BrandColors.memberGold,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BrandColors.memberGold,
  },
});
