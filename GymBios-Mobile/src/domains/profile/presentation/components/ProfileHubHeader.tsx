import { Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

interface ProfileHubHeaderProps {
  title?: string;
  onClose: () => void;
}

export function ProfileHubHeader({ title, onClose }: ProfileHubHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.titleContainer}>
        {title ? (
          <Typography variant="subtitle" style={styles.title}>
            {title}
          </Typography>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
      <Pressable
        hitSlop={14}
        onPress={onClose}
        style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
        accessibilityRole="button"
        accessibilityLabel="Close profile hub"
      >
        <Feather name="x" size={22} color={BrandColors.textPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    backgroundColor: '#ffffff',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  placeholder: {
    width: 24,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonPressed: {
    backgroundColor: '#e2e8f0',
    transform: [{ scale: 0.94 }],
  },
});
