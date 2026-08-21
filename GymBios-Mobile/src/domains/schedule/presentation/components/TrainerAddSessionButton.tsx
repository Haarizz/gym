import { Pressable, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing } from '@/core/theme';

interface TrainerAddSessionButtonProps {
  onPress?: () => void;
}

export function TrainerAddSessionButton({ onPress }: TrainerAddSessionButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Add New Session"
    >
      <LinearGradient
        colors={[BrandColors.trainerAmber, '#D97706']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.container}
      >
        <Feather name="plus" size={20} color="#FFFFFF" />
        <Text style={styles.text}>Add New Session</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.lg,
    padding: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
